const { commandHandler, automodHandler, statsHandler } = require("@src/handlers");
const { EMBED_COLORS, PREFIX_COMMANDS, AICHAT } = require("@root/config");
const { getSettings } = require("@schemas/Guild");
const { EmbedBuilder } = require("discord.js");
const { text } = require("stream/consumers");
const { aiChat } = require("@helpers/ChatGeneration");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').Message} message
 *
 */

module.exports = async (client, message, guild) => {
  if (!message.guild || message.author.bot) return;
  const settings = await getSettings(message.guild);
  const emptyMention = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setThumbnail(client.user.displayAvatarURL())
    .setDescription(
      `Приветики я **${message.guild.members.me.displayName}!**\n Личный Бот **${message.guild.name} 🥰**\nМой Префикс \`${settings.prefix}\`\nДля помощи используй команду **/help**\n`
    );
  // command handler
  let isCommand = false;
  if (PREFIX_COMMANDS.ENABLED) {
    // check for bot mentions
    if (message.content.includes(`${client.user.id}`)) {
      const regextext = /<@[!&]?(\d+)> (.+)/;
      const mentionWithTextMatch = message.content.match(regextext);
      if (mentionWithTextMatch && AICHAT.ENABLED) {
        const mentionedText = mentionWithTextMatch[2];
        message.channel.sendTyping();
        message.reply(await aiChat(mentionedText));
      } else {
        message.reply({ embeds: [emptyMention] });
      }
    }

    if (message.content && message.content.startsWith(settings.prefix)) {
      const invoke = message.content.replace(`${settings.prefix}`, "").split(/\s+/)[0];
      const cmd = client.getCommand(invoke);
      if (cmd) {
        isCommand = true;
        commandHandler.handlePrefixCommand(message, cmd, settings);
      }
    }
  }

  // stats handler
  if (settings.stats.enabled) await statsHandler.trackMessageStats(message, isCommand, settings);

  // if not a command
  if (!isCommand) await automodHandler.performAutomod(message, settings);

  // runCompletion function to use the OpenAi API to generate results based on user prompts
};
