export default async function clientReady(context, client) {
    context.log(`Login: ${client.user.tag}`);
}