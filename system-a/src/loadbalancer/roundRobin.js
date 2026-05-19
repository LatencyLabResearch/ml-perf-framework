const config = require('../server/config');

const instances = config.instances;

let index = 0;

function next() {

    if (!instances.length) {
        throw new Error('No instances available');
    }

    const instance = instances[index];

    index = (index + 1) % instances.length;

    return instance;
}

module.exports = { next };