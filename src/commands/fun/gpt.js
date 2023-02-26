// Require necessary modules and create configuration
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
/**

@type {import("@structures/Command")}
*/
// Command Module exporting an object with the command details and properties
module.exports = {
    name: "gpt",
    description: "промnт для ChatGPT (Experimental)", // String describing the command
    category: "FUN", // Category to which the command belongs
    command: {
        enabled: true, // Boolean to activate or deactivate command
        aliases: ["chat"], // Array of alternate strings used to call command
        usage: "", // Instruction on how to use the command
        minArgsCount: 1, // Integer for minimum arguments count
    },
    slashCommand: {
        enabled: true, // Boolean to turn on or off
        options: [
            {
                name: "prompt", // Option name that is assigned to a value in an object
                description: "промnт для ChatGPT", // Description of the option
                type: ApplicationCommandOptionType.String, // Data type of the value
                required: true, // Boolean indicating if it is mandatory or not
            },
        ],
    },

    async messageRun(message, args) {
        const prompt = args.join(" "); // Joins the index of an array into a single string
        const embed = new EmbedBuilder() // Creates a new embed object
          .setColor(EMBED_COLORS.BOT_EMBED)
          .setTitle("ChatGPT") // Sets the title of the embed
          .setDescription("Отвечаю..."); // Sets the description of the embed
        const reply = await message.safeReply({ embeds: [embed] }); // Sends the "Responding..." message to a chat as a reply with the embed
        const response = await runCompletion(prompt); // Awaits for the result of runCompletion function
        embed.setDescription(response); // Updates the description of the embed with the response
        await reply.edit({ embeds: [embed] }); // Edits the original reply with the updated embed
      },

    // interactionRun function that takes interactions as parameter and follows up with a response
    async interactionRun(interaction) {
        const prompt = interaction.options.getString("prompt"); // Reads values of a prompt option from an object
        const response = await runCompletion(prompt); // Passes the value to a runCompletion function
        const embed = new EmbedBuilder() // Creates a new embed object
            .setColor(EMBED_COLORS.BOT_EMBED)
            .setTitle("ChatGPT") // Sets the title of the embed
            .setDescription(response); // Sets the description of the embed
        await interaction.followUp({ embeds: [embed] }); // Returns the response back to the interaction with the embed
    },
};


// runCompletion function to use the OpenAi API to generate results based on user prompts
async function runCompletion(message) {
    const completion = await openai.createCompletion({
        model: "text-davinci-003", // Name of a model to use
        prompt: message, // User prompt as a string
        max_tokens: 350, // Maximum number of tokens (words) allowed in a response
        presence_penalty: 1.5,
    });
    return completion.data.choices[0].text; // Returns the top scoring completion generated by the model
}