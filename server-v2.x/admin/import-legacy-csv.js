/* eslint-disable no-console */
/* eslint-disable object-curly-newline */
/* eslint-disable camelcase */
const { MongoClient } = require('mongodb');
const csv = require('csv-parser');
const fs = require('fs');
const config = require('../src/config');
const { getIpid } = require('../src/services/ipid');

async function run() {
    const url = `mongodb://${config.get('dbHost')}/rpnow?maxPoolSize=1`; // pool size 1 means that it won't insert stuff out of order
    const db = (await MongoClient.connect(url));

    const newRoomIds = new Map();
    const newCharaIds = new Map();

    // Rooms
    const roomStream = fs.createReadStream('/tmp/rooms.csv').pipe(csv());
    roomStream.on('data', async ({ Number, ID, Title, Description, Time_Created, IP }) => {
        const room = {
            title: Title,
            desc: Description,
            ipid: getIpid(IP),
            timestamp: new Date(Time_Created).getTime() / 1000,
        };

        const roomId = (await db.collection('rooms').insertOne(room)).insertedId;

        await db.collection('rpCodes').insertOne({ _id: ID, roomId });
        // await db.collection('rpCodes').updateOne({ _id: ID }, { roomId });

        newRoomIds.set(Number, roomId);

        if (Number % 1000 === 0) console.log(`${Number} Room ${ID}`);
    }).on('end', () => {
        // Charas
        const charaStream = fs.createReadStream('/tmp/charas.csv').pipe(csv());
        charaStream.on('data', async ({ Number, Name, Color, Room_Number, Time_Created, IP, Deleted }) => {
            if (+Deleted) return;

            const roomId = newRoomIds.get(Room_Number);
            const chara = {
                roomId,
                name: Name,
                color: Color.toLowerCase(),
                ipid: getIpid(IP),
                timestamp: new Date(Time_Created).getTime() / 1000,
            };

            const charaId = (await db.collection('charas').insertOne(chara)).insertedId;

            newCharaIds.set(Number, charaId);

            if (Number % 1000 === 0) console.log(`${Number} Chara in ${roomId}/${Room_Number}`);
        }).on('end', () => {
            // Messages
            const messageStream = fs.createReadStream('/tmp/messages.csv').pipe(csv());
            messageStream.on('data', async ({ Number, Type, Content, Room_Number, Time_Created, Chara_Number, IP, Deleted }) => {
                if (+Deleted) return;

                const roomId = newRoomIds.get(Room_Number);
                const msg = {
                    roomId,
                    type: (Type === 'Narrator' ? 'narrator' : (Type === 'Character' ? 'chara' : 'ooc')), // eslint-disable-line no-nested-ternary
                    content: Content,
                    ipid: getIpid(IP),
                    timestamp: new Date(Time_Created).getTime() / 1000,
                };
                if (msg.type === 'chara') msg.charaId = newCharaIds.get(Chara_Number);

                await db.collection('messages').insertOne(msg);
                if (Number % 1000 === 0) console.log(`${Number} Message in ${roomId}/${Room_Number}`);
            }).on('end', () => {
                console.log('done parsing');
            });
        });
    });
}

run();
