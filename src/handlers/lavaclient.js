const { EmbedBuilder } = require("discord.js");
const { Cluster } = require("lavaclient");
const { EMBED_COLORS } = require("@root/config");
const prettyMs = require("pretty-ms");
const { load, SpotifyItemType } = require("@lavaclient/spotify");
require("@lavaclient/queue/register");

/**
 * @param {import("@structures/BotClient")} client
 */
module.exports = (client) => {
  load({
    client: {
      id: process.env.SPOTIFY_CLIENT_ID,
      secret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    autoResolveYoutubeTracks: false,
    loaders: [SpotifyItemType.Album, SpotifyItemType.Artist, SpotifyItemType.Playlist, SpotifyItemType.Track],
  });

  const lavaclient = new Cluster({
    nodes: client.config.MUSIC.LAVALINK_NODES,
    sendGatewayPayload: (id, payload) => client.guilds.cache.get(id)?.shard?.send(payload),
  });

  client.ws.on("VOICE_SERVER_UPDATE", (data) => lavaclient.handleVoiceUpdate(data));
  client.ws.on("VOICE_STATE_UPDATE", (data) => lavaclient.handleVoiceUpdate(data));

  lavaclient.on("nodeConnect", (node, event) => {
    client.logger.log(`Node "${node.id}" connected`);
  });

  lavaclient.on("nodeDisconnect", (node, event) => {
    client.logger.log(`Node "${node.id}" disconnected`);
  });

  lavaclient.on("nodeError", (node, error) => {
    client.logger.error(`Node "${node.id}" encountered an error: ${error.message}.`);
  });

  lavaclient.on("nodeDebug", (node, message) => {
    client.logger.debug(`Node "${node.id}" debug: ${message}`);
  });

  lavaclient.on("nodeTrackStart", (_node, queue, song) => {
    const fields = [];

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Сейчас Играет" })
      .setColor(client.config.EMBED_COLORS.BOT_EMBED)
      .setDescription(`[${song.title}](${song.uri})`)
      .setFooter({ text: `Запрошено Пользователем: ${song.requester}` });

    if (song.sourceName === "youtube") {
      const identifier = song.identifier;
      const thumbnail = `https://img.youtube.com/vi/${identifier}/hqdefault.jpg`;
      embed.setThumbnail(thumbnail);
    }

    fields.push({
      name: "Длительность Песни",
      value: "`" + prettyMs(song.length, { colonNotation: true }) + "`",
      inline: true,
    });

    if (queue.tracks.length > 0) {
      fields.push({
        name: "Позиция в очереди",
        value: (queue.tracks.length + 1).toString(),
        inline: true,
      });
    }

    embed.setFields(fields);
    queue.data.channel.safeSend({ embeds: [embed] });
  });

  lavaclient.on("nodeQueueFinish", async (_node, queue) => {
    const channel = client.channels.cache.get(queue.player.channelId);
    const embed = new EmbedBuilder().setColor(EMBED_COLORS.BOT_EMBED).setDescription("👋 Очередь закончилась");
    queue.data.channel.safeSend({ embeds: [embed] });
    //channel.safeSend("Очередь закончилась.");
    await client.musicManager.destroyPlayer(queue.player.guildId).then(queue.player.disconnect());
  });

  return lavaclient;
};
