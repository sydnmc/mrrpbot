const fs = require('fs');

function readServerChannels(guildName, lookingForFire, filterUser) {
    let messagesList = [];
    let channels = fs.readdirSync(`./messagecache/${guildName}`);

    channels.forEach(channel => {
        let channelData = JSON.parse(fs.readFileSync(`./messagecache/${guildName}/${channel}`));
        channelData.forEach(message => {
            if (filterUser != undefined) { //if we have a user to filter for
                if (filterUser == message.authorId) {
                    if (message.fireReacts > 0 && lookingForFire && (message.content.length > 0 || message.attachmentUrl)) { //filtering for fire emojis, and making sure the message has some content
                        messagesList.push(message);
                    } else if (!lookingForFire && (message.content.length > 0 || message.attachmentUrl)) {
                        messagesList.push(message);
                    }
                }
            } else {
                if (message.fireReacts > 0 && lookingForFire && (message.content.length > 0 || message.attachmentUrl)) {
                    messagesList.push(message);
                } else if (!lookingForFire) {
                    messagesList.push(message);
                }
            }
        });
    });

    return messagesList;
}

module.exports = {
    readServerChannels
}