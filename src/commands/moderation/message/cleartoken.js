const { clearMessages } = require("@helpers/ModUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "cleartoken",
  description: "удаляет указанное количество сообщений с токеном",
  category: "MODERATION",
  userPermissions: ["ManageMessages"],
  botPermissions: ["ManageMessages", "ReadMessageHistory"],
  command: {
    enabled: true,
    usage: "<token> [amount]",
    minArgsCount: 1,
  },

  async messageRun(message, args) {
    const token = args[0];
    const amount = (args.length > 1 && args[1]) || 99;

    if (amount) {
      if (isNaN(amount)) return message.safeReply("Допускаются только цифры");
      if (parseInt(amount) > 99)
        return message.safeReply("Максимальное количество сообщений которые я могу удалить составляет 99");
    }

    const { channel } = message;
    const response = await clearMessages(message.member, message.channel, "TOKEN", amount, token);

    if (typeof response === "number") {
      return channel.safeSend(`Успешно удалено ${response} сообщений!`, 5);
    } else if (response === "BOT_PERM") {
      return message.safeReply(
        "У меня нет Прав `Прочитать историю сообщений` и `Управление сообщениями`, чтобы удалить сообщения",
        5
      );
    } else if (response === "MEMBER_PERM") {
      return message.safeReply(
        "У тебя нет Прав `Прочитать историю сообщений` и `Управление сообщениями`, чтобы удалять сообщения",
        5
      );
    } else if (response === "NO_MESSAGES") {
      return channel.safeSend("🚫 Не найдено сообщений, которые можно очистить", 5);
    } else {
      return message.safeReply(`❗ Произошла ошибка! Не удалось удалить сообщения`);
    }
  },
};
