const getRandomItem = (array) => {
    if (!Array.isArray(array) || array.length === 0) {
        return null;
    }
    return array[Math.floor(Math.random() * array.length)];
};

const getRandomItems = (array, count) => {
    if (!Array.isArray(array) || array.length === 0 || count <= 0) {
        return [];
    }
    
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
};

const getWeightedRandom = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }
    
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
        random -= (item.weight || 1);
        if (random <= 0) {
            return item;
        }
    }
    
    return items[items.length - 1];
};

const getRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomBoolean = (probability = 0.5) => {
    return Math.random() < probability;
};

module.exports = {
    getRandomItem,
    getRandomItems,
    getWeightedRandom,
    getRandomNumber,
    getRandomBoolean
};