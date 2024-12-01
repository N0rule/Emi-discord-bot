const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ApplicationCommandOptionType,
  ComponentType,
} = require("discord.js");
const { formatTime } = require("@helpers/Utils");
const { EMBED_COLORS, MUSIC } = require("@root/config");


/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "search",
  description: "поиск подходящих песен на ютубе",
  category: "MUSIC",
  botPermissions: ["EmbedLinks"],
  cooldown: 10,
  command: {
    enabled: true,
    usage: "<song-name>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "query",
        description: "песня для поиска",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const query = args.join(" ");
    const response = await search(message, query);
    if (response) await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const query = interaction.options.getString("query");
    const response = await search(interaction, query);
    if (response) await interaction.followUp(response);
    else interaction.deleteReply();
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {string} query
 */
async function search({ member, guild, channel }, query) {
  if (!member.voice.channel) return "🚫 Для начала нужно находится в голосовом канале";

  let player = guild.client.musicManager.players.resolve(guild.id);
  if (player && !guild.members.me.voice.channel) {
    player.voice.disconnect();
    await guild.client.musicManager.players.destroy(guild.id);
  }
  if (player && member.voice.channel !== guild.members.me.voice.channel) {
    return "🚫 Нужно находится в том же голосовом канале что и бот";
  }

  let res;
  try {
    res = await guild.client.musicManager.api.loadTracks(
      /^https?:\/\//.test(query) ? query : `${MUSIC.DEFAULT_SOURCE}:${query}`
    );
  } catch (err) {
    return "🚫 Произошла ошибка при поиске песни";
  }

  let embed = new EmbedBuilder().setColor(EMBED_COLORS.BOT_EMBED);
  let tracks;

  switch (res.loadType) {
    case "error":
      guild.client.logger.error("Search Exception", res.data);
      return "🚫 Произошла ошибка при поиске песни";

    case "empty":
      return `Нет результатов подходящих под: ${query}`;

      case "track": {
        const track = res.data[0];
        tracks = [track];
        if (!player?.playing && !player?.paused && !player?.queue.tracks.length) {
          embed.setAuthor({ name: "Песня добавлена в очередь" });
      }

      const fields = [];
      embed
        .setAuthor({ name: "Песня добавлена в очередь" })
        .setDescription(`[${track.info.title}](${track.info.uri})`)
        .setFooter({ text: `Запрошено Пользователем: ${member.user.username}` });

      fields.push({
        name: "Длительность песни",
        value: "`" + formatTime(track.info.length) + "`",
        inline: true,
      });

      if (player?.queue?.tracks?.length > 0) {
        fields.push({
          name: "Позиция в Очереди",
          value: (player.queue.tracks.length + 1).toString(),
          inline: true,
        });
      }
      embed.addFields(fields);
      break;
    }

    case "playlist":
      tracks = res.data.tracks;
      embed
        .setAuthor({ name: "Плейлист добавлен в очередь" })
        .setDescription(res.data.info.name)
        .addFields(
          {
            name: "Исключено",
            value: `${res.data.tracks.length} песен`,
            inline: true,
          },
          {
            name: "Длительность Плейлиста",
            value:
              "`" +
              formatTime(
                res.data.tracks.map((t) => t.info.length).reduce((a, b) => a + b, 0),
              ) +
              "`",
            inline: true,
          }
        )
        .setFooter({ text: `Запрошено Пользователем: ${member.user.username}` });
      break;

      case "search": {
      let max = guild.client.config.MUSIC.MAX_SEARCH_RESULTS;
      if (res.data.length < max) max = res.data.length;

      const results = res.data.slice(0, max);
      const options = results.map((result, index) => ({
        label: result.info.title,
        value: index.toString(),
      }));

      const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("search-results")
          .setPlaceholder("Выберите результат поиска")
          .setMaxValues(max)
          .addOptions(options)
      );

      const tempEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setAuthor({ name: "Результат Поиска" })
        .setDescription(`Выберите песню которую хотите добавить в очередь`);

      const sentMsg = await channel.send({
        embeds: [tempEmbed],
        components: [menuRow],
      });

      try {
        const response = await channel.awaitMessageComponent({
          filter: (reactor) => reactor.message.id === sentMsg.id && reactor.user.id === member.id,
          idle: 30 * 1000,
          componentType: ComponentType.StringSelect,
        });

        await sentMsg.delete();
        if (!response) return "🚫 Вы слишком долго выбирали песню";

        if (response.customId !== "search-results") return;
        const toAdd = [];
        response.values.forEach((v) => toAdd.push(results[v]));

        // Only 1 song is selected
        if (toAdd.length === 1) {
          tracks = [toAdd[0]];
          embed.setAuthor({ name: "Песня добавлена в очередь" });
        } else {
          tracks = toAdd;
          embed
            .setDescription(`🎶 добавлено ${toAdd.length} песен в очередь`)
            .setFooter({ text: `Запрошено Пользователем: ${member.user.username}` });
        }
      } catch (err) {
        console.log(err);
        await sentMsg.delete();
        return "🚫 Ошибка выбора ответа";
      }
      break;
    }
  }

  // create a player and/or join the member's vc
  if (!player?.connected) {
    player = guild.client.musicManager.players.create(guild.id);
    player.queue.data.channel = channel;
    player.voice.connect(member.voice.channel.id, { deafened: true });
  }

  // do queue things
  const started = player.playing || player.paused;
  player.queue.add(tracks, { requester: member.user.username, next: false });
  if (!started) {
    await player.queue.start();
  }

  return { embeds: [embed] };
}
