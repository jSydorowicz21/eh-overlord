// function to dm the bot owner when an error occurs
async function errorNoticeHelper(error, client, interaction) {
    const owner = await client.users.fetch('138673796675534848');
    await owner.send(
        `An error occurred: ${error}
        Interaction: ${interaction.id}
        User: ${interaction.user.id}
        Stack: ${error.stack}
        `
    );
    try {
        await interaction.editReply(`There was an error during your request. <@138673796675534848> has been notified of the error.`);
    }
    catch (error) {
        await interaction.update(`There was an error during your request. <@138673796675534848> has been notified of the error.`);
    }
}

module.exports = errorNoticeHelper;
