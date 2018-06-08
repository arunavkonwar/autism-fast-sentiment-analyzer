RANDOM := $(shell bash -c 'echo $$RANDOM')

CONTAINER=pr/python3:custom

flask_serve:
	docker run -p 5000:5000 --name vivatech_${RANDOM} -w /workspace -v ${PWD}:/workspace --rm ${CONTAINER} python3 main.py

docker_build:
	docker build -t silgon/vivatech -f docker/Dockerfile .

