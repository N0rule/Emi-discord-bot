const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");
const { log, warn, error } = require("@helpers/Logger");
const { RequestError, VRChatAPI } = require('vrc-ts');

const api = new VRChatAPI(process.env.VRC_LOGIN, process.env.VRC_PASSWORD);

module.exports = {
  name: "vrchat",
  description: "Получить информацию о пользователе vrchat!",
  cooldown: 5,
  category: "UTILITY",
  botPermissions: ["SendMessages", "EmbedLinks"],
  command: {
    enabled: true,
    usage: "<username>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "username",
        description: "Имя пользователя vrchat!",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  async messageRun(message, args) {
    const username = args[0];
    const response = await getUserInfo(username, message.author);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const username = interaction.options.getString("username");
    const response = await getUserInfo(username, interaction.user);
    await interaction.followUp(response);
  },
}
setTimeout(() => {
  if (module.exports.command.enabled || module.exports.slashCommand.enabled) {
    authenticateUser();
   }
  }, 5000);


 async function authenticateUser() {
  try {
    await api.login();
    log(`Logged in successfully as ${api.currentUser?.displayName}!`);
  } catch (error) {
    if (error instanceof RequestError) {
      error(`Failed to login: ${error.message}`);
    } else {
      error(`An unexpected error occurred: ${error}`);
    }
  }
}

async function getUserInfo(username, author) {
  try {
    const searchResults = await api.userApi.searchAllUsers({ search: username, n: 1, offset: 0 });

    if (!searchResults || searchResults.length === 0) {
      return { content: "🚫 Пользователь не найден." };
    }

    const userInfo = searchResults[0];

    // Wait to avoid rate-limiting before requesting more detailed info by ID
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

    // Get detailed user information
    const detailedUserInfo = await api.userApi.getUserById({ userId: userInfo.id });

    // const isSubscriber = await api.userApi.isVRCPlusSubcriber({ user: detailedUserInfo });

    // Fetch represented group
    let representedGroup;
    try {
      representedGroup = await api.userApi.getUserRepresentedGroup({ userId: detailedUserInfo.id });
    } catch (err) {
      console.error("Error fetching represented group:", err);
      representedGroup = null;
    }

    const embed = new EmbedBuilder()
      .setTitle(`VRchat Пользователь: ${detailedUserInfo.displayName}`)
      .setColor(EMBED_COLORS.SUCCESS)
      .setTimestamp();

    // Basic Information
    if (detailedUserInfo.displayName) {
      embed.addFields({ name: "Имя пользователя:", value: detailedUserInfo.displayName, inline: true });
    }

    if (detailedUserInfo.id) {
      embed.addFields({ name: "ID:", value: detailedUserInfo.id, inline: true });
    }

    // Profile Information
    if (detailedUserInfo.bio && detailedUserInfo.bio.trim()) {
      embed.addFields({ name: "БИО:", value: detailedUserInfo.bio, inline: false });
    }

    if (detailedUserInfo.bioLinks?.length > 0) {
      embed.addFields({
        name: "Ссылки в БИО:",
        value: detailedUserInfo.bioLinks.join("\n"),
        inline: false
      });
    }

    // Represented Group
    if (representedGroup?.name) {
      embed.addFields({ 
        name: "Представляемая группа:", 
        value: representedGroup.name, 
        inline: false 
      });
    } else {
      embed.addFields({ 
        name: "Представляемая группа:", 
        value: "Не указана", 
        inline: false 
      });
    }

    // // VRCHAT+ Subscription
    // embed.addFields({
    //   name: "VRCHAT+ Подписка:",
    //   value: isSubscriber ? "Да" : "Нет",
    //   inline: true
    // });

    // Status Information
    if (detailedUserInfo.status) {
      embed.addFields({ name: "Статус:", value: detailedUserInfo.status, inline: true });
    }

    if (detailedUserInfo.statusDescription && detailedUserInfo.statusDescription.trim()) {
      embed.addFields({ 
        name: "Описание Статуса:", 
        value: detailedUserInfo.statusDescription, 
        inline: true 
      });
    }

    // Platform & Activity
    if (detailedUserInfo.last_platform) {
      embed.addFields({ 
        name: "Последняя Платформа:", 
        value: detailedUserInfo.last_platform, 
        inline: true 
      });
    }

    if (detailedUserInfo.date_joined) {
      embed.addFields({ 
        name: "Дата регистрации:", 
        value: detailedUserInfo.date_joined, 
        inline: true 
      });
    }

    if (detailedUserInfo.ageVerificationStatus) {
      embed.addFields({ 
        name: "Верификация возраста:", 
        value: detailedUserInfo.ageVerificationStatus, 
        inline: true 
      });
    }

    // Avatar Information
    if (detailedUserInfo.allowAvatarCopying !== undefined) {
      embed.addFields({ 
        name: "Копирование аватара:", 
        value: detailedUserInfo.allowAvatarCopying ? "Да" : "Нет", 
        inline: true 
      });
    }

    if (detailedUserInfo.badges?.length > 0) {
      const badgeNames = detailedUserInfo.badges.map(badge => badge.badgeName);
      embed.addFields({ 
        name: "Значки:", 
        value: badgeNames.join(", "), 
        inline: false 
      });
    }

    // All Tags
    if (detailedUserInfo.tags?.length > 0) {
      embed.addFields({ 
        name: "Теги:", 
        value: detailedUserInfo.tags.join(", "), 
        inline: false 
      });
    }

    // Set profile image
    const profileImage = detailedUserInfo.currentAvatarImageUrl;
    if (profileImage) {
      embed.setImage(profileImage);
    }

    // Set thumbnail
    if (detailedUserInfo.profilePicOverrideThumbnail) {
      embed.setThumbnail(detailedUserInfo.profilePicOverrideThumbnail);
    }

    embed.setFooter({
      text: `Запрошено пользователем ${author.username}`,
    });

    return { embeds: [embed] };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return { content: "Произошла ошибка при получении пользовательской информации.", error };
  }
}
