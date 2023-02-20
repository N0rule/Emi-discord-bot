const { EmbedBuilder } = require("discord.js");
const { getUser } = require("@schemas/User");
const { EMBED_COLORS, ECONOMY } = require("@root/config");

module.exports = async (user, coins) => {
  if (isNaN(coins) || coins <= 0) return "Пожалуйста, введите действительное количество монет для депозита";
  const userDb = await getUser(user);

  if (coins > userDb.bank) return `У вас всего ${userDb.bank}${ECONOMY.CURRENCY} монет в вашем Банке`;

  userDb.bank -= coins;
  userDb.coins += coins;
  await userDb.save();

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setAuthor({ name: "Новый Баланс" })
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: "Кошелек",
        value: `${userDb.coins}${ECONOMY.CURRENCY}`,
        inline: true,
      },
      {
        name: "Банк",
        value: `${userDb.bank}${ECONOMY.CURRENCY}`,
        inline: true,
      },
      {
        name: "Общая Сумма",
        value: `${userDb.coins + userDb.bank}${ECONOMY.CURRENCY}`,
        inline: true,
      }
    );

  return { embeds: [embed] };
};
