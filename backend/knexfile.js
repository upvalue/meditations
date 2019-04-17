// Update with your config settings.

module.exports = {

  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.MEDITATIONS_DB || './development.sqlite3'
    }
  },
};
