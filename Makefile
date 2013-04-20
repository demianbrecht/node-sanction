REPORTER=spec

debug:
	mocha debug

test:
	mocha -R $(REPORTER) 

test-cov: lib-cov
	@EXPRESS_COV=1 mocha -R html-cov > coverage.html

lib-cov:
	@jscoverage lib lib-cov
