.PHONY: schema

schema: backend/src/graphql-typedefs.ts frontend/src/api/mock/graphql-typedefs.ts

backend/src/graphql-typedefs.ts: shared/schema.gql
	echo "import { gql } from 'apollo-server'" > $@
	echo "export const typeDefs = gql\`" >> $@
	cat $< >> $@
	echo "\`" >> $@

frontend/src/api/mock/graphql-typedefs.ts: shared/schema.gql
	echo "export const typeDefs = \`" > $@
	cat $< >> $@
	echo "\`" >> $@
