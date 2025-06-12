const { EmbedBuilder, SlashCommandBuilder, ModalBuilder } = require('discord.js');
const { embedColor } = require('../config.json');

function doDiffLogic(userInteraction, isSlash) {
  let userParams = '';
  if (!isSlash) {
    userParams = userInteraction.content.split('?diff ')[1];
  } else {
    userParams = userInteraction.options.getString('type');
  }
  console.log(userParams);

  if (userParams.includes('add')) {
    return addDiff(userInteraction, isSlash); //we wanna return, since this returns back to the original export~
  }
}

function addDiff(beatmapLink) {
  userInteraction.channel.send('link the beatmap below! :3');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diff')
        .setDescription('edits difficulty information for yuru.ca :0'),
    async execute(interaction) {
        await interaction.reply(doDiffLogic(interaction.channel, true));
    },
    doDiffLogic
};
