const fs = require('fs');
const path = require('path');

module.exports = async (client) => {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        
        console.log(`📌 이벤트 로드: ${event.name}`);
    }
    
    console.log(`✅ 총 ${eventFiles.length}개의 이벤트를 로드했어요!`);
};