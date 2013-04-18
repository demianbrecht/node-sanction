REPORTER = dot

test:
	./node_modules/.bin/mocha debug --reporter $(REPORTER)

.PHONY: test
