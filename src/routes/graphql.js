const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');

const typeDefs = gql`
    type Rp {
        rpCode: String
        title: String
    }
    type Query {
        rps: [Rp]
    }
    type Mutation {
        createRp(title: String!): Rp
    }
`;

const resolvers = {
    Query: {
        rps: () => [ { title: 'hi' } ]
    },
    Mutation: {
        createRp() {},

    }
};

const apollo = new ApolloServer({ typeDefs, resolvers });
const app = express();
apollo.applyMiddleware({ app, path: '/graphql' });

module.exports = app;
