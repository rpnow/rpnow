const { MongoClient } = require('mongodb');
const config = require('../src/config');

async function run() {
    const url = `mongodb://${config.get('dbHost')}`;
    const db = (await MongoClient.connect(url)).db('rpnow');

    // do something
    const rooms = await db.collection('rooms').find({ msgs: { $exists: true } });

    let roomsInProgress = 0;
    rooms.forEach(async (room) => {
        console.log(`Room ${room.rpCode} ---- msgs:${room.msgs.length}   charas:${room.charas.length}`);

        ++roomsInProgress;

        let newCharaIds = null;

        if (room.charas) {
            await db.collection('charas').deleteMany({ roomId: room._id });

            if (room.charas.length > 0) {
                newCharaIds = (await db.collection('charas').insertMany(room.charas.map(c => ({ ...c, roomId: room._id })))).insertedIds;
            }

            await db.collection('rooms').updateOne({ _id: room._id }, { $unset: { charas: '' } });
        }

        if (room.msgs) {
            await db.collection('messages').deleteMany({ roomId: room._id });

            if (room.msgs.length > 0) {
                await db.collection('messages').insertMany(room.msgs.map(m => (
                    (m.charaId != null) ?
                        { ...m, roomId: room._id, charaId: newCharaIds[m.charaId] } :
                        { ...m, roomId: room._id }
                )));
            }

            await db.collection('rooms').updateOne({ _id: room._id }, { $unset: { msgs: '' } });
        }

        if (room.rpCode) {
            await db.collection('rpCodes').deleteMany({ roomId: room._id });

            await db.collection('rpCodes').insertOne({ _id: room.rpCode, roomId: room._id });

            await db.collection('rooms').updateOne({ _id: room._id }, { $unset: { rpCode: '' } });
        }

        setTimeout(() => {
            --roomsInProgress;
            if (roomsInProgress === 0) {
                db.close();
            }
        }, 1000);
    });
}

run();
