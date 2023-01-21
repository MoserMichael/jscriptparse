
.PHONY: docs2
docs2:
		./build/build-docs2.sh

.PHONY: docs
docs:
		./build/build-docs.sh

.PHONY: test
test:
		./build/test.sh

