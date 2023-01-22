

.PHONY: publish-prs
publish-prs:
		./build/publish-prs.sh			

.PHONY: publish-pyx
publish-pyx:
		./build/publish-pyx.sh			

.PHONY: publish-prs
publish-prs:
		./build/publish-prs.sh			


.PHONY: docs2
docs2:
		./build/build-docs2.sh

.PHONY: docs
docs:
		./build/build-docs.sh

.PHONY: install
install:
		./build/install.sh

.PHONY: test
test: install
		./build/test.sh

