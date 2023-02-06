
.PHONY: test
test: install
		./build/test.sh tests
		./build/test.sh leetcode

.PHONY: publish-prs
publish-prs:
		./build/publish-prs.sh			

.PHONY: publish-pyx
publish-pyx:
		./pyx ./build/publish-pyx.p			

.PHONY: docs2
docs2:
		./build/build-docs2.sh

.PHONY: docs
docs:
		./build/build-docs.sh

.PHONY: install
install:
		./build/install.sh


