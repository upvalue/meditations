.PHONY: schema

schema: backend/src/graphql-typedefs.ts frontend/src/api/mock/graphql-typedefs.ts frontend/src/api/types.ts

frontend/src/api/types.ts: backend/src/types.ts
	cp $< $@

frontend/src/api/mock/graphql-typedefs.ts: backend/src/schema.gql
	echo "export const typeDefs = \`" > $@
	cat $< >> $@
	echo "\`" >> $@
