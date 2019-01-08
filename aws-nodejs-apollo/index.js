const { ApolloServer, gql } = require('apollo-server');
const ApolloServerLambda = require('apollo-server-lambda').ApolloServer;
const Sequelize = require("sequelize");
const {User, MinAmount, sequelize} = require('./models.js');

const typeDefs = gql`
  type Query {
    hello:  String
  }

  type Mutation {
    validateAndAddUser(name: String, balance: Int): User
  }

  type User {
    id:       Int
    name:     String
    balance:  Int
  }
`;

const resolvers = {
    Query: {
        hello: () => "world",
    },
    Mutation: {
        validateAndAddUser: async (_, { name, balance }) => {
            return await sequelize.transaction(async (t) => {
                try {
                    const minAmount = await MinAmount.findOne({}, {transaction: t});
                    if (balance >= minAmount.amount) {
                        const user = await User.create({
                            name: name,
                            balance: balance
                        });
                        return user;
                    } else {
                        throw new Error("balance too low, required atleast " + minAmount.amount);
                    }
                } catch (e) {
                    console.log(e);
                    throw new Error(e);
                }
            });
        }
    }
};

const server = new ApolloServerLambda({
    typeDefs,
    resolvers,
    context: ({ event, context }) => ({
        headers: event.headers,
        functionName: context.functionName,
        event,
        context,
    }),
});

exports.handler = server.createHandler({
    cors: {
        origin: '*',
        credentials: true,
        allowedHeaders: 'Content-Type, Authorization'
    },
});

// For local development
if( process.env.LAMBDA_LOCAL_DEVELOPMENT == "1") {
    const serverLocal = new ApolloServer({ typeDefs, resolvers });

    serverLocal.listen().then(({ url }) => {
        console.log(`Server ready at ${url}`);
    });
}
