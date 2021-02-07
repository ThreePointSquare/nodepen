import { gql } from 'apollo-server'

export const schema = gql`
  type Query {
    getUser(id: String!): UserManifest!
    getComputeConfiguration: [GrasshopperComponent]!
  }

  type Mutation {
    updateConfiguration: String
    setConfiguration(config: String): String
  }

  type UserManifest {
    graphs: [String]
    session: String
  }

  type GrasshopperComponent {
    guid: String!
    name: String!
    nickname: String!
    description: String!
    icon: String
    libraryName: String!
    category: String!
    subcategory: String!
    isObsolete: Boolean!
    isVariable: Boolean!
    inputs: [GrasshopperComponentParameter]!
    outputs: [GrasshopperComponentParameter]!
  }

  type GrasshopperComponentParameter {
    name: String!
    nickname: String!
    description: String!
    type: String!
    isOptional: Boolean!
  }
`
