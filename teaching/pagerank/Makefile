CXX = g++
CXXFLAGS = -std=c++17 -O3 -march=native -flto -DNDEBUG

.PHONY: all clean run run-python run-cpp install-deps

all: enwiki_pagerank
	./enwiki_pagerank 2003

cpp: enwiki_pagerank

enwiki_pagerank: enwiki_pagerank.cpp
	$(CXX) $(CXXFLAGS) -o enwiki_pagerank enwiki_pagerank.cpp

run-python:
	python3 enwiki_pagerank.py

run-cpp: enwiki_pagerank
	./enwiki_pagerank

run-ui: enwiki_pagerank
	./enwiki_pagerank && echo "🚀 Starting React UI..." && npm start

run: run-python

clean:
	rm -f enwiki_pagerank pagerank_iter_*.json public/pagerank_iter_*.json enwiki.wikilink_graph.*.csv* *.tmp

install-deps:
	pip3 install igraph pandas requests tqdm

install-system-deps:
	sudo apt-get update && sudo apt-get install -y python3-pip build-essential wget

debug: CXXFLAGS = -std=c++17 -O0 -g -fsanitize=address
debug: enwiki_pagerank

.DEFAULT_GOAL := all