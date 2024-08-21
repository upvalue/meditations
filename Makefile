meditations:
	go build

docker-build:
	rm -rf docker-out
	mkdir -p docker-out
	docker compose -f docker-compose.build.yml up --build --force-recreate --remove-orphans

docker-run:
	docker-compose -f docker-compose.run.yml up --build 


clean:
	rm meditations
