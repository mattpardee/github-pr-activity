let config;

try {
  config = require('../config/github.json');
} catch(err) {
  config = {
    token: process.env.TOKEN,
  };
}

const client = require('graphql-client')({
  url: 'https://api.github.com/graphql',
  headers: {
    Authorization: `Bearer ${config.token}`,
  },
});

module.exports = (owner, user, authorOrCommenter = 'author', since) => {
  return client.query(`
  {
    search(query: "is:pr user:${owner} ${authorOrCommenter}:${user} created:>${since}", type: ISSUE, last: 100) {
      edges {
        node {
          ... on PullRequest {
            author {
              login
            }
            title
            state
            mergedAt
            createdAt
            updatedAt
            url
            repository {
              nameWithOwner
            }
            participants(last:100) {
              edges {
                node {
                  name
                  login
                }
              }
            }
          }
        }
      }
    }
  }`, {}, function(req, res) {
    if(res.status === 401) {
      throw new Error('Not authorized');
    }
  });
}
