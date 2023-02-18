
.PHONY: test
test: install
		bash -exc "./build/test.sh tests; ./build/test.sh leetcode; ./build/test.sh errorTest"

.PHONY: test-installed
test-installed:
		bash -exc "node --version; ./build/test.sh tests pyx; ./build/test.sh leetcode pyx; ./build/test.sh errorTest pyx"


.PHONY: test-in-docker-ubuntu
test-in-docker-ubuntu:
		@echo "*** test in docker - ubuntu ***"
		./build/test-in-docker-ubuntu.sh

.PHONY: test-in-docker-fedora
test-in-docker-fedora:
		@echo "*** test in docker - fedora ***"
		./build/test-in-docker-fedora.sh

.PHONY: test-in-docker
test-in-docker: test-in-docker-ubuntu  test-in-docker-fedora
		@echo "*** test in docker ***"


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


