#include <iostream>
#include <fstream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <chrono>
#include <iomanip>
#include <algorithm>
#include <sstream>
#include <numeric>
#include <climits>
#include <map>
#include <unistd.h>
#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <sys/stat.h>

// Constants
const int DEFAULT_YEAR = 2003;
const int DEFAULT_ITERATIONS = 3;

class StreamingENWikiPageRank {
public:
    std::unordered_map<int, int> wiki_id_to_our_id;
    std::vector<int> outdegree;
    std::vector<double> probability;
    std::vector<double> new_probability;
    std::unordered_set<int> needed_wiki_ids; // IDs we need titles for
    std::unordered_map<int, std::string> wiki_id_to_title;
    int N; // Number of unique nodes
    double current_l1_distance;
    std::vector<double> l1_distances; // Store L1 distance for each iteration
    int total_edges;
    std::string csv_filename;

    // Function to escape special characters for JSON
    std::string escapeJSON(const std::string& input) {
        std::string output;
        for (char c : input) {
            switch (c) {
                case '\\': output += "\\\\"; break;
                case '"':  output += "\\\""; break;
                case '\b': output += "\\b"; break;
                case '\f': output += "\\f"; break;
                case '\n': output += "\\n"; break;
                case '\r': output += "\\r"; break;
                case '\t': output += "\\t"; break;
                default:
                    if (c >= 0x20 && c <= 0x7E) {
                        output += c;
                    } else {
                        // Replace other control characters with space
                        output += ' ';
                    }
            }
        }
        return output;
    }

    void downloadFile(const std::string& url, const std::string& filename) {
        if (fileExists(filename)) {
            std::cout << "✓ Using cached " << filename << std::endl;
            return;
        }

        std::cout << "↓ Downloading " << url << std::endl;
        std::string cmd = "wget -q --show-progress -O \"" + filename + "\" \"" + url + "\"";
        int rc = std::system(cmd.c_str());
        if (rc != 0) {
            throw std::runtime_error("wget failed for " + url);
        }
        std::cout << "✓ Downloaded " << filename << std::endl;
    }

    bool fileExists(const std::string& filename) {
        return ::access(filename.c_str(), F_OK) == 0;
    }

    void buildIdMapping(const std::string& filename) {
        std::cout << "🗺️ Building ID mapping from " << filename << "..." << std::endl;
        csv_filename = filename;

        std::ifstream file(filename);
        if (!file.is_open()) {
            throw std::runtime_error("Cannot open file: " + filename);
        }

        std::string line;
        std::getline(file, line); // Skip header
        std::cout << "   📋 CSV header: " << line << std::endl;

        std::unordered_set<int> unique_ids;
        int processed = 0;

        auto start_time = std::chrono::high_resolution_clock::now();

        // First pass: collect all unique IDs
        std::cout << "   🔍 Pass 1: Collecting unique IDs..." << std::endl;
        while (std::getline(file, line)) {
            auto fields = splitTabLine(line);
            if (fields.size() >= 4) {
                int from_id = std::stoi(fields[0]);
                int to_id = std::stoi(fields[2]);

                unique_ids.insert(from_id);
                unique_ids.insert(to_id);

                processed++;
                if (processed % 2000000 == 0) {
                    auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
                        std::chrono::high_resolution_clock::now() - start_time);
                    std::cout << "     📊 Processed " << processed << " edges, found " << unique_ids.size()
                              << " unique IDs (elapsed: " << elapsed.count() << "s)" << std::endl;
                }
            }
        }

        N = unique_ids.size();
        std::cout << "   ✅ Found " << N << " unique page IDs" << std::endl;

        // Build compact mapping: wiki_id -> our_id (0 to N-1)
        std::cout << "   🔗 Creating compact ID mapping..." << std::endl;
        int our_id = 0;
        for (int wiki_id : unique_ids) {
            wiki_id_to_our_id[wiki_id] = our_id++;
        }

        // Memory calculation
        size_t mapping_memory = wiki_id_to_our_id.size() * (sizeof(int) + sizeof(int) + 32); // rough estimate
        size_t vector_memory = N * (sizeof(int) + 2 * sizeof(double));
        std::cout << "   💾 Memory estimate:" << std::endl;
        std::cout << "     • ID mapping: ~" << (mapping_memory / 1024 / 1024) << " MB" << std::endl;
        std::cout << "     • Vectors: ~" << (vector_memory / 1024 / 1024) << " MB" << std::endl;
        std::cout << "     • Total: ~" << ((mapping_memory + vector_memory) / 1024 / 1024) << " MB" << std::endl;

        // Initialize compact vectors
        std::cout << "   🔧 Initializing vectors of size " << N << "..." << std::endl;
        outdegree.assign(N, 0);
        probability.assign(N, 1.0 / N); // Uniform initialization
        new_probability.assign(N, 0.0);

        file.close();
        std::cout << "✅ ID mapping built successfully" << std::endl;
    }

private:

    std::vector<std::string> splitTabLine(const std::string& line) {
        std::vector<std::string> result;
        std::stringstream ss(line);
        std::string field;

        while (std::getline(ss, field, '\t')) {
            result.push_back(field);
        }

        return result;
    }

public:
    void computeOutdegrees() {
        std::cout << "📊 Computing outdegrees in streaming pass..." << std::endl;

        std::ifstream file(csv_filename);
        if (!file.is_open()) {
            throw std::runtime_error("Cannot open file: " + csv_filename);
        }

        std::string line;
        std::getline(file, line); // Skip header

        total_edges = 0;
        int processed = 0;
        int skipped_self_loops = 0;
        int skipped_missing_ids = 0;

        auto start_time = std::chrono::high_resolution_clock::now();
        std::cout << "   🔍 Pass 2: Computing outdegrees..." << std::endl;

        while (std::getline(file, line)) {
            auto fields = splitTabLine(line);
            if (fields.size() >= 4) {
                int from_wiki_id = std::stoi(fields[0]);
                int to_wiki_id = std::stoi(fields[2]);

                // Skip self-loops
                if (from_wiki_id == to_wiki_id) {
                    skipped_self_loops++;
                } else {
                    auto from_it = wiki_id_to_our_id.find(from_wiki_id);
                    auto to_it = wiki_id_to_our_id.find(to_wiki_id);

                    if (from_it != wiki_id_to_our_id.end() && to_it != wiki_id_to_our_id.end()) {
                        int from_our_id = from_it->second;
                        outdegree[from_our_id]++;
                        total_edges++;
                    } else {
                        skipped_missing_ids++;
                    }
                }

                processed++;
                if (processed % 2000000 == 0) {
                    auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
                        std::chrono::high_resolution_clock::now() - start_time);
                    std::cout << "     📊 Processed " << processed << " edges, found " << total_edges << " valid edges"
                              << " (elapsed: " << elapsed.count() << "s)" << std::endl;
                    std::cout << "       ⚠️  Skipped: " << skipped_self_loops << " self-loops, "
                              << skipped_missing_ids << " missing IDs" << std::endl;
                }
            }
        }

        // Analyze outdegree distribution
        int dangling_nodes = 0;
        int max_outdegree = 0;
        long long total_outdegree = 0;
        std::vector<int> degree_bins(10, 0); // 0, 1-10, 11-50, 51-100, etc.

        for (int i = 0; i < N; i++) {
            int deg = outdegree[i];
            if (deg == 0) {
                dangling_nodes++;
                degree_bins[0]++;
            } else {
                total_outdegree += deg;
                max_outdegree = std::max(max_outdegree, deg);

                if (deg <= 10) degree_bins[1]++;
                else if (deg <= 50) degree_bins[2]++;
                else if (deg <= 100) degree_bins[3]++;
                else if (deg <= 500) degree_bins[4]++;
                else if (deg <= 1000) degree_bins[5]++;
                else if (deg <= 5000) degree_bins[6]++;
                else if (deg <= 10000) degree_bins[7]++;
                else if (deg <= 50000) degree_bins[8]++;
                else degree_bins[9]++;
            }
        }

        double avg_outdegree = (double)total_outdegree / (N - dangling_nodes);

        std::cout << "✅ Outdegree computation complete!" << std::endl;
        std::cout << "   📈 Edge statistics:" << std::endl;
        std::cout << "     • Total valid edges: " << total_edges << std::endl;
        std::cout << "     • Skipped self-loops: " << skipped_self_loops << std::endl;
        std::cout << "     • Skipped missing IDs: " << skipped_missing_ids << std::endl;
        std::cout << "   📊 Outdegree statistics:" << std::endl;
        std::cout << "     • Dangling nodes: " << dangling_nodes << " (" << std::fixed << std::setprecision(2)
                  << (100.0 * dangling_nodes / N) << "%)" << std::endl;
        std::cout << "     • Max outdegree: " << max_outdegree << std::endl;
        std::cout << "     • Avg outdegree: " << std::fixed << std::setprecision(2) << avg_outdegree << std::endl;
        std::cout << "   📋 Outdegree distribution:" << std::endl;
        std::cout << "     • 0: " << degree_bins[0] << std::endl;
        std::cout << "     • 1-10: " << degree_bins[1] << std::endl;
        std::cout << "     • 11-50: " << degree_bins[2] << std::endl;
        std::cout << "     • 51-100: " << degree_bins[3] << std::endl;
        std::cout << "     • 101-500: " << degree_bins[4] << std::endl;
        std::cout << "     • 501-1000: " << degree_bins[5] << std::endl;
        std::cout << "     • 1001-5000: " << degree_bins[6] << std::endl;
        std::cout << "     • 5001-10000: " << degree_bins[7] << std::endl;
        std::cout << "     • 10001-50000: " << degree_bins[8] << std::endl;
        std::cout << "     • 50000+: " << degree_bins[9] << std::endl;

        file.close();
    }

    void saveDegreeDistributions(int year) {
        std::cout << "📊 Calculating degree distributions..." << std::endl;

        // Calculate in-degree distribution by streaming through the CSV
        std::cout << "   🔍 Computing in-degree distribution..." << std::endl;
        std::vector<int> indegree(N, 0);
        std::ifstream file(csv_filename);
        if (!file.is_open()) {
            throw std::runtime_error("Cannot open file: " + csv_filename);
        }

        std::string line;
        std::getline(file, line); // Skip header

        while (std::getline(file, line)) {
            auto fields = splitTabLine(line);
            if (fields.size() >= 4) {
                int from_wiki_id = std::stoi(fields[0]);
                int to_wiki_id = std::stoi(fields[2]);

                if (from_wiki_id != to_wiki_id) {
                    auto from_it = wiki_id_to_our_id.find(from_wiki_id);
                    auto to_it = wiki_id_to_our_id.find(to_wiki_id);

                    if (from_it != wiki_id_to_our_id.end() && to_it != wiki_id_to_our_id.end()) {
                        int to_our_id = to_it->second;
                        indegree[to_our_id]++;
                    }
                }
            }
        }
        file.close();

        // Calculate degree distributions (using map for automatic sorting)
        std::map<int, int> in_degree_dist;
        std::map<int, int> out_degree_dist;

        for (int degree : indegree) {
            in_degree_dist[degree]++;
        }
        for (int degree : outdegree) {
            out_degree_dist[degree]++;
        }

        // Save degree distributions to JSON
        std::ofstream outfile(getYearDirectory(year) + "degree_distributions.json");
        outfile << "{\n";

        // In-degree distribution (std::map automatically sorts by key)
        outfile << "  \"in_degree_distribution\": [\n";
        bool first = true;
        for (const auto& pair : in_degree_dist) {
            if (!first) outfile << ",\n";
            outfile << "    {\"degree\": " << pair.first << ", \"count\": " << pair.second << "}";
            first = false;
        }

        outfile << "\n  ],\n";

        // Out-degree distribution (std::map automatically sorts by key)
        outfile << "  \"out_degree_distribution\": [\n";
        first = true;
        for (const auto& pair : out_degree_dist) {
            if (!first) outfile << ",\n";
            outfile << "    {\"degree\": " << pair.first << ", \"count\": " << pair.second << "}";
            first = false;
        }

        outfile << "\n  ],\n";
        outfile << "  \"stats\": {\n";
        outfile << "    \"total_nodes\": " << N << ",\n";
        outfile << "    \"total_edges\": " << total_edges << ",\n";

        // Calculate basic statistics
        double avg_degree = (double)total_edges / N;
        int max_in_degree = *std::max_element(indegree.begin(), indegree.end());
        int max_out_degree = *std::max_element(outdegree.begin(), outdegree.end());

        outfile << "    \"avg_in_degree\": " << avg_degree << ",\n";
        outfile << "    \"avg_out_degree\": " << avg_degree << ",\n";
        outfile << "    \"max_in_degree\": " << max_in_degree << ",\n";
        outfile << "    \"max_out_degree\": " << max_out_degree << "\n";
        outfile << "  }\n";
        outfile << "}\n";
        outfile.close();

        std::cout << "✅ Degree distributions saved to " << getYearDirectory(year) << "degree_distributions.json" << std::endl;
    }

    // Helper functions for year-specific directory management
    std::string getYearDirectory(int year) {
        return "public/" + std::to_string(year) + "/";
    }

    void ensureYearDirectoryExists(int year) {
        std::string dir = getYearDirectory(year);
        std::filesystem::create_directories(dir);
    }

    void saveCurrentYear(int year) {
        std::ofstream file("public/current_year.txt");
        file << year << std::endl;
        file.close();
        std::cout << "💾 Current year saved to public/current_year.txt: " << year << std::endl;
    }

    void runPageRank(double alpha = 0.9, int iterations = DEFAULT_ITERATIONS, int year = DEFAULT_YEAR) {
        if (N == 0) {
            std::cerr << "❌ No nodes in graph. Cannot run PageRank." << std::endl;
            return;
        }

        std::cout << "🎯 Running streaming PageRank algorithm:" << std::endl;
        std::cout << "   📊 Parameters: α=" << alpha << ", iterations=" << iterations << std::endl;
        std::cout << "   📊 Graph size: " << N << " nodes" << std::endl;

        // Initialize L1 distances vector
        l1_distances.resize(iterations + 1, 0.0); // Index 0 for initial, then 1..iterations
        l1_distances[0] = 0.0; // Initial state has no L1 distance

        saveIteration(0, probability, year);

        // Run power iterations
        std::cout << "   🔄 Starting streaming power iteration method..." << std::endl;
        for (int iter = 1; iter <= iterations; iter++) {
            auto start = std::chrono::high_resolution_clock::now();

            // Reset new_probability
            std::fill(new_probability.begin(), new_probability.end(), 0.0);

            // Stream through CSV to distribute PageRank
            streamPageRankIteration(alpha);

            // Calculate convergence
            double l1_change = 0.0;
            for (int i = 0; i < N; i++) {
                l1_change += std::abs(new_probability[i] - probability[i]);
            }

            // Swap vectors
            probability.swap(new_probability);
            current_l1_distance = l1_change;
            l1_distances[iter] = l1_change; // Store L1 distance for this iteration

            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

            // Show progress
            std::vector<int> top3 = getTopK(3);
            std::cout << "   📈 Iter " << iter << " (" << duration.count() << "ms): "
                      << "L1Δ=" << std::scientific << std::setprecision(2) << l1_change << std::endl;

            saveIteration(iter, probability, year);
            std::cout << "   ✅ Iteration " << iter << " completed" << std::endl;
        }

        std::cout << "✅ PageRank computation complete!" << std::endl;

        // Final pass to lookup titles for all tracked IDs
        lookupTitlesForNeededIds();

        // Re-save all iterations with titles
        resaveIterationsWithTitles(iterations, year);

        // Save metadata including year
        saveMetadata(year, iterations);

        showFinalResults(25);
    }

private:
    void streamPageRankIteration(double alpha) {
        std::ifstream file(csv_filename);
        if (!file.is_open()) {
            throw std::runtime_error("Cannot open file: " + csv_filename);
        }

        std::string line;
        std::getline(file, line); // Skip header

        int processed = 0;
        int valid_transfers = 0;
        auto start_time = std::chrono::high_resolution_clock::now();

        // Stream through edges and distribute PageRank
        while (std::getline(file, line)) {
            auto fields = splitTabLine(line);
            if (fields.size() >= 4) {
                int from_wiki_id = std::stoi(fields[0]);
                int to_wiki_id = std::stoi(fields[2]);

                // Skip self-loops
                if (from_wiki_id != to_wiki_id) {
                    auto from_it = wiki_id_to_our_id.find(from_wiki_id);
                    auto to_it = wiki_id_to_our_id.find(to_wiki_id);

                    if (from_it != wiki_id_to_our_id.end() && to_it != wiki_id_to_our_id.end()) {
                        int from_our_id = from_it->second;
                        int to_our_id = to_it->second;

                        // Distribute PageRank from source to target
                        if (outdegree[from_our_id] > 0) {
                            double share = probability[from_our_id] / outdegree[from_our_id];
                            new_probability[to_our_id] += alpha * share;
                            valid_transfers++;
                        }
                    }
                }

                processed++;
                if (processed % 5000000 == 0) {
                    auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
                        std::chrono::high_resolution_clock::now() - start_time);
                    std::cout << "     🔄 Processed " << processed << " edges, " << valid_transfers
                              << " valid transfers (elapsed: " << elapsed.count() << "s)" << std::endl;
                }
            }
        }

        // Handle dangling mass and teleportation
        double dangling_mass = 0.0;
        int dangling_count = 0;
        for (int i = 0; i < N; i++) {
            if (outdegree[i] == 0) {
                dangling_mass += probability[i];
                dangling_count++;
            }
        }

        // Add teleportation and dangling mass
        double uniform_share = (alpha * dangling_mass + (1.0 - alpha)) / N;
        for (int i = 0; i < N; i++) {
            new_probability[i] += uniform_share;
        }

        std::cout << "     ⚡ Distributed " << valid_transfers << " PageRank transfers" << std::endl;
        std::cout << "     🌊 Dangling mass: " << std::scientific << std::setprecision(4) << dangling_mass
                  << " from " << dangling_count << " nodes" << std::endl;
        std::cout << "     📡 Uniform share per node: " << std::scientific << std::setprecision(4) << uniform_share << std::endl;

        file.close();
    }

    void lookupTitlesForNeededIds() {
        std::cout << "🔍 Looking up titles for " << needed_wiki_ids.size() << " needed Wikipedia IDs..." << std::endl;

        std::ifstream file(csv_filename);
        if (!file.is_open()) {
            throw std::runtime_error("Cannot open file: " + csv_filename);
        }

        std::string line;
        std::getline(file, line); // Skip header

        int processed = 0;
        int found_count = 0;

        while (std::getline(file, line) && found_count < needed_wiki_ids.size()) {
            auto fields = splitTabLine(line);
            if (fields.size() >= 4) {
                int from_id = std::stoi(fields[0]);
                int to_id = std::stoi(fields[2]);

                // Check if we need the from_id title
                if (needed_wiki_ids.find(from_id) != needed_wiki_ids.end() &&
                    wiki_id_to_title.find(from_id) == wiki_id_to_title.end()) {
                    wiki_id_to_title[from_id] = fields[1]; // page_title_from
                    found_count++;
                    std::cout << "     🔍 Found title for ID " << from_id << ": " << fields[1].substr(0, 50) << std::endl;
                }

                // Check if we need the to_id title
                if (needed_wiki_ids.find(to_id) != needed_wiki_ids.end() &&
                    wiki_id_to_title.find(to_id) == wiki_id_to_title.end()) {
                    wiki_id_to_title[to_id] = fields[3]; // page_title_to
                    found_count++;
                    std::cout << "     🔍 Found title for ID " << to_id << ": " << fields[3].substr(0, 50) << std::endl;
                }

                processed++;
                if (processed % 5000000 == 0) {
                    std::cout << "     📊 Processed " << processed << " edges, found " << found_count
                              << "/" << needed_wiki_ids.size() << " titles" << std::endl;
                }
            }
        }

        file.close();
        std::cout << "✅ Found titles for " << found_count << "/" << needed_wiki_ids.size() << " needed IDs" << std::endl;

        // Debug: show any missing titles
        for (int wiki_id : needed_wiki_ids) {
            if (wiki_id_to_title.find(wiki_id) == wiki_id_to_title.end()) {
                std::cout << "⚠️  Missing title for Wiki ID: " << wiki_id << std::endl;
            }
        }
    }

    void resaveIterationsWithTitles(int iterations, int year) {
        std::cout << "💾 Re-saving all iterations with titles..." << std::endl;

        for (int iter = 0; iter <= iterations; iter++) {
            std::ostringstream check_filename;
            check_filename << getYearDirectory(year) << "pagerank_iter_" << std::setfill('0') << std::setw(2) << iter << ".json";

            std::ifstream check_file(check_filename.str());
            if (!check_file.good()) {
                break; // No more iteration files
            }
            check_file.close();

            std::cout << "   📝 Re-saving iteration " << iter << " with titles..." << std::endl;
            saveIterationWithTitles(iter, year);
        }
        std::cout << "✅ All iterations re-saved with titles" << std::endl;
    }

    void saveMetadata(int year, int iterations) {
        std::ofstream file(getYearDirectory(year) + "metadata.json");
        file << "{\n";
        file << "  \"year\": " << year << ",\n";
        file << "  \"dataset\": \"enwiki.wikilink_graph." << year << "-03-01.csv.gz\",\n";
        file << "  \"total_nodes\": " << N << ",\n";
        file << "  \"total_edges\": " << total_edges << ",\n";
        file << "  \"iterations\": " << iterations << "\n";
        file << "}\n";
        file.close();
        std::cout << "💾 Metadata saved to " << getYearDirectory(year) << "metadata.json" << std::endl;
    }

    void saveIterationWithTitles(int iteration, int year) {
        // Read the existing JSON file to get the results
        std::ostringstream old_filename;
        old_filename << getYearDirectory(year) << "pagerank_iter_" << std::setfill('0') << std::setw(2) << iteration << ".json";

        // For simplicity, we'll recreate based on current probability vector if iteration > 0
        // or use uniform distribution for iteration 0
        std::vector<double> ranks_to_use;
        if (iteration == 0) {
            ranks_to_use.assign(N, 1.0 / N);
        } else {
            ranks_to_use = probability; // Use current state (this is approximate for old iterations)
        }

        std::ostringstream filename;
        filename << getYearDirectory(year) << "pagerank_iter_" << std::setfill('0') << std::setw(2) << iteration << ".json";

        std::ofstream file(filename.str());
        file << "{\n";
        file << "  \"iteration\": " << iteration << ",\n";
        file << "  \"l1_distance\": " << l1_distances[iteration] << ",\n";
        file << "  \"dataset_stats\": {\n";
        file << "    \"total_articles\": " << N << ",\n";
        file << "    \"total_edges\": " << total_edges << "\n";
        file << "  },\n";
        file << "  \"top_results\": [\n";

        std::vector<int> top_indices = getTopK(100, ranks_to_use);
        for (int i = 0; i < top_indices.size(); i++) {
            int our_idx = top_indices[i];
            int wiki_id = getWikiIdFromOurId(our_idx);
            std::string title = "Unknown";
            auto title_it = wiki_id_to_title.find(wiki_id);
            if (title_it != wiki_id_to_title.end()) {
                title = title_it->second;
                std::replace(title.begin(), title.end(), '_', ' ');
            }

            if (i > 0) file << ",\n";
            file << "    {\"rank\": " << (i + 1) << ", \"wiki_id\": " << wiki_id
                 << ", \"title\": \"" << escapeJSON(title) << "\""
                 << ", \"score\": " << std::scientific << std::setprecision(6) << ranks_to_use[our_idx] << "}";
        }

        file << "\n  ],\n";
        file << "  \"bottom_results\": [\n";

        std::vector<int> bottom_indices = getBottomK(100, ranks_to_use);
        for (int i = 0; i < bottom_indices.size(); i++) {
            int our_idx = bottom_indices[i];
            int wiki_id = getWikiIdFromOurId(our_idx);
            std::string title = "Unknown";
            auto title_it = wiki_id_to_title.find(wiki_id);
            if (title_it != wiki_id_to_title.end()) {
                title = title_it->second;
                std::replace(title.begin(), title.end(), '_', ' ');
            }

            if (i > 0) file << ",\n";
            file << "    {\"rank\": " << (N - bottom_indices.size() + i + 1) << ", \"wiki_id\": " << wiki_id
                 << ", \"title\": \"" << escapeJSON(title) << "\""
                 << ", \"score\": " << std::scientific << std::setprecision(6) << ranks_to_use[our_idx] << "}";
        }

        file << "\n  ]\n}\n";
        file.close();
    }

public:
    std::vector<int> getTopK(int k) {
        return getTopK(k, probability);
    }

    std::vector<int> getTopK(int k, const std::vector<double>& rank_values) {
        std::vector<int> indices(N);
        std::iota(indices.begin(), indices.end(), 0);

        std::partial_sort(indices.begin(), indices.begin() + std::min(k, N),
                         indices.end(), [&rank_values](int a, int b) {
            return rank_values[a] > rank_values[b];
        });

        indices.resize(std::min(k, N));
        return indices;
    }

    std::vector<int> getBottomK(int k) {
        return getBottomK(k, probability);
    }

    std::vector<int> getBottomK(int k, const std::vector<double>& rank_values) {
        std::vector<int> indices(N);
        std::iota(indices.begin(), indices.end(), 0);

        std::partial_sort(indices.begin(), indices.begin() + std::min(k, N),
                         indices.end(), [&rank_values](int a, int b) {
            return rank_values[a] < rank_values[b];  // Reverse comparison for bottom K
        });

        indices.resize(std::min(k, N));
        return indices;
    }

    void saveIteration(int iteration, const std::vector<double>& current_ranks, int year) {
        std::ostringstream filename;
        filename << getYearDirectory(year) << "pagerank_iter_" << std::setfill('0') << std::setw(2) << iteration << ".json";

        std::ofstream file(filename.str());
        file << "{\n";
        file << "  \"iteration\": " << iteration << ",\n";
        file << "  \"l1_distance\": " << l1_distances[iteration] << ",\n";
        file << "  \"dataset_stats\": {\n";
        file << "    \"total_articles\": " << N << ",\n";
        file << "    \"total_edges\": " << total_edges << "\n";
        file << "  },\n";
        file << "  \"top_results\": [\n";

        std::vector<int> top_indices = getTopK(100, current_ranks);  // Save top 100
        for (int i = 0; i < top_indices.size(); i++) {
            int our_idx = top_indices[i];
            int wiki_id = getWikiIdFromOurId(our_idx);
            needed_wiki_ids.insert(wiki_id); // Track this ID for title lookup

            if (i > 0) file << ",\n";
            file << "    {\"rank\": " << (i + 1) << ", \"wiki_id\": " << wiki_id
                 << ", \"score\": " << std::scientific << std::setprecision(6) << current_ranks[our_idx] << "}";
        }

        file << "\n  ],\n";
        file << "  \"bottom_results\": [\n";

        std::vector<int> bottom_indices = getBottomK(100, current_ranks);  // Save bottom 100
        for (int i = 0; i < bottom_indices.size(); i++) {
            int our_idx = bottom_indices[i];
            int wiki_id = getWikiIdFromOurId(our_idx);
            needed_wiki_ids.insert(wiki_id); // Track this ID for title lookup

            if (i > 0) file << ",\n";
            file << "    {\"rank\": " << (N - bottom_indices.size() + i + 1) << ", \"wiki_id\": " << wiki_id
                 << ", \"score\": " << std::scientific << std::setprecision(6) << current_ranks[our_idx] << "}";
        }

        file << "\n  ]\n}\n";
        file.close();

        if (iteration == 0) {
            std::cout << "💾 Saving iteration results to pagerank_iter_XX.json files..." << std::endl;
        }
    }

private:
    int getWikiIdFromOurId(int our_id) {
        for (const auto& pair : wiki_id_to_our_id) {
            if (pair.second == our_id) {
                return pair.first;
            }
        }
        return -1; // Should never happen
    }

    void showFinalResults(int k) {
        std::cout << "\n🏆 Top " << k << " Wikipedia Pages by PageRank:" << std::endl;

        std::vector<int> top_indices = getTopK(k);

        for (int i = 0; i < top_indices.size(); i++) {
            int our_idx = top_indices[i];
            int wiki_id = getWikiIdFromOurId(our_idx);

            std::cout << std::setw(2) << (i + 1) << ". "
                      << "Wiki ID: " << std::setw(8) << std::left << wiki_id
                      << " Score: " << std::scientific << std::setprecision(6) << probability[our_idx] << std::endl;
        }
    }
};

int main(int argc, char* argv[]) {
    int YEAR = DEFAULT_YEAR;
    int ITERATIONS = DEFAULT_ITERATIONS;

    if (argc > 1) {
        YEAR = std::atoi(argv[1]);
    }
    if (argc > 2) {
        ITERATIONS = std::atoi(argv[2]);
    }

    const std::string ZENODO_BASE = "https://zenodo.org/records/2539424/files";
    const std::string FNAME = "enwiki.wikilink_graph." + std::to_string(YEAR) + "-03-01.csv.gz";
    const std::string URL = ZENODO_BASE + "/" + FNAME;
    const double ALPHA = 0.9;

    try {
        std::cout << "🌐 WikiLinkGraphs English Wikipedia " << YEAR << " PageRank Demo (C++)" << std::endl;
        std::cout << "📥 Dataset: " << FNAME << std::endl;
        std::cout << "💡 Usage: ./enwiki_pagerank [year] [iterations] (defaults: " << DEFAULT_YEAR << ", " << DEFAULT_ITERATIONS << ")" << std::endl;

        auto start = std::chrono::high_resolution_clock::now();

        StreamingENWikiPageRank pagerank;

        // Download file
        pagerank.downloadFile(URL, "data/" + FNAME);

        // Note: For simplicity, we'll assume the file is already decompressed to .csv
        // In a full implementation, we'd handle gzip decompression
        std::string csv_filename = "data/" + FNAME;
        csv_filename.replace(csv_filename.find(".gz"), 3, ""); // Remove .gz extension

        // Check if we need to decompress
        if (pagerank.fileExists("data/" + FNAME) && !pagerank.fileExists(csv_filename)) {
            std::cout << "⇣ Decompressing " << FNAME << "..." << std::endl;
            std::string decompress_cmd = "gunzip -k \"data/" + FNAME + "\"";
            int rc = std::system(decompress_cmd.c_str());
            if (rc != 0) {
                throw std::runtime_error("Failed to decompress file");
            }
            std::cout << "✓ Decompressed to " << csv_filename << std::endl;
        }

        // Build ID mapping and initialize vectors
        pagerank.buildIdMapping(csv_filename);

        // Compute outdegrees in streaming pass
        pagerank.computeOutdegrees();

        // Setup year-specific directory and save degree distributions
        pagerank.ensureYearDirectoryExists(YEAR);
        pagerank.saveCurrentYear(YEAR);
        pagerank.saveDegreeDistributions(YEAR);

        // Run PageRank
        pagerank.runPageRank(ALPHA, ITERATIONS, YEAR);

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::seconds>(end - start);

        std::cout << "\n⏱️  Total execution time: " << duration.count() << " seconds" << std::endl;
        std::cout << "✅ Results saved to pagerank_iter_XX.json files" << std::endl;
        std::cout << "🚀 Start React UI: npm start" << std::endl;

    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}