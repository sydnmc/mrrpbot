const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { embedColor } = require('../config.json');
const fs = require('fs');

function uploadFile(userInteraction, isSlash) {
 	let authorId;
	if (!isSlash) {
		authorId = userInteraction.author.id;
	} else {
		authorId = userInteraction.user.id;
	}

	let userDirectory = `./usercache/${authorId}`; //despite being up from here, this is executed at main.js - so we write with ./
  let userFilePath = userDirectory+`/info.json`;
  let userInfo = {};
  if (!fs.existsSync(userDirectory)) {
    fs.mkdirSync(userDirectory, { recursive: true }); //makes the user directory if it doesn't exist :3
    if (!fs.existsSync(userFilePath)) { //we also wanna add at least something to the user file if it doesn't exist >w<
      fs.writeFileSync(userFilePath, JSON.stringify(userInfo));
    }
  } else { //if it does exist, let's load in the data :O
    userInfo = fs.readFileSync(userFilePath);
    userInfo = JSON.parse(userInfo);
  }

  //for now, i'm just saving each user's info manually, so there's no method to write anything :p however, in the future i would like to do some sort of OAuth2 thingie :O

  let returnMessage;
  let fileUrl = userInteraction.attachments.entries().next().value[1].attachment; //no like yeah sure that makes sense man
  if (isSlash) {

  }
  if (!userInfo.flanstoreKey) {
    returnMessage = "i-it seems like you don't have a flanstore login,, you should contact lilac or sydney about this >_<;;";
  }
  if (!fileUrl) {
    returnMessage = "you have to attach something, otherwise i won't know what to upload >.<,,";
  } else {
    return {"fileUrl":fileUrl, "fileName":userInteraction.attachments.entries().next().value[1].name, "apiKey":userInfo.flanstoreKey, "user":userInfo.flanstoreUser};
  }

  if (!isSlash) { //if we get any errors, then we send a message directly here~
    return userInteraction.channel.send(returnMessage);
  } else {
    return returnMessage;
  }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('uploads a file to flanstore.yuru.ca, our person upload server :0'),
    async execute(interaction) {
        await interaction.reply(uploadFile(interaction.channel, true));
    },
    uploadFile
};
