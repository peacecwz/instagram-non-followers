import 'dotenv/config';
import { IgApiClient, Feed } from 'instagram-private-api';
import { writeFile, readFile } from 'fs';

const ig = new IgApiClient();

ig.state.generateDevice(process.env.IG_USERNAME);

(async () => {
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    const followersFeed = ig.feed.accountFollowers(ig.state.cookieUserId);
    const followingFeed = ig.feed.accountFollowing(ig.state.cookieUserId);

    const existingFollowers: any[] = await readJsonFromFile("./dump/followers.json");
    const existingFollowing: any[] = await readJsonFromFile("./dump/following.json");

    const followers = await getAllItemsFromFeed(followersFeed);
    const following = await getAllItemsFromFeed(followingFeed);

    const changedFollowers = followers.filter(({ pk }) => !existingFollowers.some((user) => user.pk === pk));
    const changedFollowing = following.filter(({ pk }) => !existingFollowing.some((user) => user.pk === pk));

    await writeObjectAsJsonToFile(changedFollowers, "./dump/changedFollowers.json");
    await writeObjectAsJsonToFile(changedFollowing, "./dump/changedFollowing.json");

    await writeObjectAsJsonToFile(followers, "./dump/followers.json");
    await writeObjectAsJsonToFile(following, "./dump/following.json");

    const followersUsername = new Set(followers.map(({ username }) => username));

    const notFollowingYou = following.filter(({ username }) => !followersUsername.has(username));

    await writeObjectAsJsonToFile(notFollowingYou, "./dump/notFollowings.json");

    for (const user of notFollowingYou) {
        // await ig.friendship.destroy(user.pk);
        console.log(`nonFollower ${user.username}`);
    }
})();

async function getAllItemsFromFeed<T>(feed: Feed<any, T>): Promise<T[]> {
    let items = [];
    do {
        items = items.concat(await feed.items());
    } while (feed.isMoreAvailable());
    return items;
}

function writeObjectAsJsonToFile(obj: any, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.stringify(obj, null, 2);
        writeFile(filePath, jsonData, 'utf8', (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function readJsonFromFile<T>(filePath: string): Promise<T> {
    return new Promise((resolve, reject) => {
        readFile(filePath, 'utf8', (error, data) => {
            if (error) {
                console.error(error);
                resolve([] as any);
            } else {
                try {
                    const obj = JSON.parse(data) as T;
                    resolve(obj);
                } catch (parseError) {
                    console.error(parseError);
                    resolve([] as any);
                }
            }
        });
    });
}