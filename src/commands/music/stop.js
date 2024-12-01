const { musicValidations } = require("@helpers/BotUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "stop",
  description: "останавливает музыку",
  category: "MUSIC",
  cooldown: 3,
  validations: musicValidations,
  command: {
    enabled: true,
    aliases: ["leave", "s"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = await stop(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await stop(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function stop({ client, guildId }) {
  const player = client.musicManager.players.resolve(guildId);
  player.voice.disconnect();
  await client.musicManager.players.destroy(guildId);
  return "🎶 Музыка была остановлена и очередь была очищена";
}
