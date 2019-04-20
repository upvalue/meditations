.PHONY: schema cloc

schema: frontend/src/api/mock/graphql-typedefs.ts frontend/src/api/types.ts

frontend/src/api/types.ts: backend/src/types.ts
	cp $< $@

frontend/src/api/mock/graphql-typedefs.ts: backend/src/schema.gql
	echo "export const typeDefs = \`" > $@
	cat $< >> $@
	echo "\`" >> $@

cloc:
	@echo 
	@echo ----- FRONTEND -----
	@echo
	cloc frontend/src
	@echo 
	@echo ----- BACKEND -----
	@echo
	cloc backend/src
	@echo 
	@echo ----- COMBINED -----
	@echo
	cloc frontend/src backend/src
