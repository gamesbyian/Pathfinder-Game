# Multilingual GitHub scout: constrained pathfinding, graph walks and puzzle solvers

**Date:** 2026-10-12. **Status:** external prior-art *candidate ledger*, not validated algorithm evidence, a production work queue, or a new question ID. Sources were found through public GitHub/web search results; implementations have not been executed or formally inspected. Links in the candidate tables point to surfaced public repository names. Names may describe related or copied projects, so repository counts are not counts of independent methods.

**Current owners:** [workstreams](solver-optimization-workstreams.md) for research priority; [research intake](research-question-intake.md) for genuinely new questions; [operating model](solver-research-operating-model.md) for evidence gates; [premise atlas](solver-premise-space-atlas.md) and [technique taxonomy](solver-technique-operational-taxonomy.md) to avoid rediscovery.

## Search thesis

Searching only for `pathfinding` misses constraint-satisfaction, SAT/SMT encodings, resource-constrained walks, Hamiltonian/one-stroke puzzles, graph-set enumeration, loop puzzles, regular-path queries, and named games. Pathfinder's task is a **gate-to-goal walk** with exact counted length and intersection count, mandatory obligations, direction-dependent turns/filters, flippers and zero-length portal jumps. A large share of familiar Hamiltonian, Zip, Witness and Numberlink techniques presume **no vertex revisits** and therefore cannot be copied as sound Pathfinder prunes. Also, `CSP` can stand for constrained shortest path *or* constraint satisfaction problem.

**Triage:** `A` = inspect first for a transferable mechanism or reference model; `B` = meaningful adjacent experiment; `C` = background, vocabulary, harnesses, duplicates or distant analogy. Grades do not imply correctness or runnable code.

## Real repository candidates

### A. Ordered paths, grid coverage and game-puzzle analogues

| Tier | GitHub repository | Distinct research lead |
|---|---|---|
| A | [chi-feng/zip-solver](https://github.com/chi-feng/zip-solver) | Ordered waypoints; exact coverage; parity, connectivity, dead ends, uniqueness |
| A | [CWSwastik/zip-solver](https://github.com/CWSwastik/zip-solver) | DFS baseline and Manhattan/connectivity pruning stages |
| B | [gtkacz/zipmould](https://github.com/gtkacz/zipmould) | Unusual slime-mould-inspired formulation for Zip |
| B | [merefield/zip-solver](https://github.com/merefield/zip-solver) | Independent Zip puzzle builder and solver |
| C | [dilohn/zip-solver](https://github.com/dilohn/zip-solver) | Zip OCR input plus puzzle solver |
| C | [patopolser/Zip-Solver](https://github.com/patopolser/Zip-Solver) | Zip detection and automated solve |
| A | [Overv/TheWitnessSolver](https://github.com/Overv/TheWitnessSolver) | Incremental region bookkeeping and must-hit propagation |
| A | [RainbowwPhoenixx/witness-solver](https://github.com/RainbowwPhoenixx/witness-solver) | Documented Witness pruning ablations and search counts |
| B | [barrycohen/ttws](https://github.com/barrycohen/ttws) | Exhaustive Witness path enumeration baseline |
| B | [ZingLix/TheWitnessSolver](https://github.com/ZingLix/TheWitnessSolver) | Witness alternate implementation; Chinese/English wording; archived |
| A | [jsnell/snakebird-solver](https://github.com/jsnell/snakebird-solver) | Compressed game states and symmetry-aware canonicalization |
| B | [IBM/chuk-puzzles-gym](https://github.com/IBM/chuk-puzzles-gym) | Hidato, Slitherlink, Bridges and other constraint puzzles |
| A | [SmilingWayne/puzzlekit](https://github.com/SmilingWayne/puzzlekit) | OR-Tools solvers across 100+ puzzle types and benchmark datasets |
| C | [vavavr00m/PuzzleSolver](https://github.com/vavavr00m/PuzzleSolver) | Related multi-puzzle solver code; assess overlap with puzzlekit |

### B. Numberlink, Flow Free and constraint encodings

| Tier | GitHub repository | Distinct research lead |
|---|---|---|
| A | [thomasahle/numberlink](https://github.com/thomasahle/numberlink) | Diagonal frontier filling, dual corner representation, optimistic checking |
| A | [tuneerroy/numberlink](https://github.com/tuneerroy/numberlink) | SAT edge/path encodings, constraint programming, benchmark studies |
| A | [leophagus/Flow-Free-Solver](https://github.com/leophagus/Flow-Free-Solver) | Pseudo-Boolean SAT exact encoding |
| A | [Torvaney/flow-solver](https://github.com/Torvaney/flow-solver) | Clojure SAT encoding and examples |
| A | [s5bug/flowsolver](https://github.com/s5bug/flowsolver) | Z3 SMT encoding for Numberlink |
| B | [juandanieltech-design/numberlink-algorithm-solver](https://github.com/juandanieltech-design/numberlink-algorithm-solver) | Spanish-associated academic comparison of CSP, DFS and greedy |
| B | [AndraCoteanu/Flow-Free-Solver](https://github.com/AndraCoteanu/Flow-Free-Solver) | SAT versus heuristic source and benchmark CSVs |
| C | [carinamarele/Flow-Free-Solver](https://github.com/carinamarele/Flow-Free-Solver) | Copy of preceding team research: lineage duplicate |
| B | [mithracodes/flow-free](https://github.com/mithracodes/flow-free) | C search with variable ordering and dead-end ablation |
| C | [lohchness/flow-free-solver](https://github.com/lohchness/flow-free-solver) | Adaptation of C Flow Free algorithm and diagnostics |
| B | [MusadiqPasha/FlowFree-Solver](https://github.com/MusadiqPasha/FlowFree-Solver) | Z3 Flow Free bot, puzzle extraction and exact solver |
| B | [kongesque/flow-free-solver](https://github.com/kongesque/flow-free-solver) | Z3 WebAssembly browser solver, other algorithms |
| B | [talkierbox/flowzero](https://github.com/talkierbox/flowzero) | SAT generation and Monte Carlo graph search; inspect incomplete modules |
| B | [jpvaishnav/Flow-free-solver](https://github.com/jpvaishnav/Flow-free-solver) | Backtracking, filtering and ordering comparisons |
| C | [brockellefson/CSCI446CSP](https://github.com/brockellefson/CSCI446CSP) | Flow Free CSP coursework and constraints |
| A | [uguryavuz/numberlink-solver](https://github.com/uguryavuz/numberlink-solver) | Google OR-Tools Numberlink implementation |
| C | [misaghsoltani/NumberLink](https://github.com/misaghsoltani/NumberLink) | Gymnasium/learning environment for Numberlink |
| B | [musabak10/Numberlink-Puzzle-Game](https://github.com/musabak10/Numberlink-Puzzle-Game) | C puzzle generator, backtracking and testable levels |

### C. Resource-constrained paths, revisits and route optimization

| Tier | GitHub repository | Distinct research lead |
|---|---|---|
| A | [torressa/cspy](https://github.com/torressa/cspy) | Resource-constrained shortest path labeling algorithms |
| A | [idea-idsia/pathwyse](https://github.com/idea-idsia/pathwyse) | Bidirectional labeling, dominance, ng-path and DSSR relaxations |
| A | [sharabhshukla/route-pricer](https://github.com/sharabhshukla/route-pricer) | Resource extension functions, bidirectional dynamic labeling |
| B | [ToonWeyens/pylgrim](https://github.com/ToonWeyens/pylgrim) | State-space augmentation and constrained elementary paths |
| B | [spoorendonk/bucket-graph-spprc](https://github.com/spoorendonk/bucket-graph-spprc) | Bucket graph resource labels and dominance |
| B | [lseman/baldes](https://github.com/lseman/baldes) | Branch-cut-price and fast RCSP subproblem machinery |
| B | [OR-toolkit/vrptw](https://github.com/OR-toolkit/vrptw) | Model layers, resource extension and path-history labels |
| B | [msmrexe/python-chinese-postman-solver](https://github.com/msmrexe/python-chinese-postman-solver) | Revisiting edges, parity and eulerisation |
| C | [supermitch/chinese-postman](https://github.com/supermitch/chinese-postman) | Independent route-inspection/postman solver |
| C | [susen325/Graph-Based-Logistics-Optimizer](https://github.com/susen325/Graph-Based-Logistics-Optimizer) | Mandatory precedence, resource budget and routes |

### D. Frontier enumeration, graph families and symbolic methods

| Tier | GitHub repository | Distinct research lead |
|---|---|---|
| A | [junkawahara/frontier_basic_tdzdd](https://github.com/junkawahara/frontier_basic_tdzdd) | Direct ZDD examples for simple/hamiltonian paths and cycles |
| A | [junkawahara/frontier](https://github.com/junkawahara/frontier) | Enumerate, count and sample paths, cuts, subgraphs with ZDD |
| A | [junkawahara/frontier-basic](https://github.com/junkawahara/frontier-basic) | Compact C/C++/C# frontier DP and SIMPATH examples |
| A | [kunisura/TdZdd](https://github.com/kunisura/TdZdd) | Generalized efficient decision-diagram library |
| A | [graphillion/graphillion](https://github.com/graphillion/graphillion) | Symbolic set of graphs and path-family operations |
| C | [nttcslab/diff-eq-comput-zdd](https://github.com/nttcslab/diff-eq-comput-zdd) | Secondary reuse of graph/path ZDD collections |
| B | [FormalLanguageConstrainedPathQuerying/formal-lang-course](https://github.com/FormalLanguageConstrainedPathQuerying/formal-lang-course) | Russian-language regular-path query/automata material |

### E. Loop, orientation, region and connectivity constraint puzzles

| Tier | GitHub repository | Distinct research lead |
|---|---|---|
| A | [JonathanGun/masyu-solver](https://github.com/JonathanGun/masyu-solver) | Masyu forced straight/turn and single-loop conditions |
| A | [xzy06/slitherlink_solver](https://github.com/xzy06/slitherlink_solver) | Chinese-language CSP and SAT loop solving |
| A | [praveenkulkarni1996/slitherlinky](https://github.com/praveenkulkarni1996/slitherlinky) | SAT reduction of global single-loop requirement |
| B | [agill123/SlitherLink](https://github.com/agill123/SlitherLink) | Choco CP solver and level generator |
| A | [simon-frankau/hashiwokakero-solver](https://github.com/simon-frankau/hashiwokakero-solver) | Degree propagation, disconnected-region contradiction, backtracking |
| B | [PierreLaur/hashiwokakero-solver](https://github.com/PierreLaur/hashiwokakero-solver) | OR-Tools connectivity/degree/uniqueness |
| B | [Sam-297/Hashiwokakero](https://github.com/Sam-297/Hashiwokakero) | French-language SAT/CNF modeling for puzzle connectivity |
| B | [erthium/hashiwokakero](https://github.com/erthium/hashiwokakero) | Rule-first recursion, generator and calibrated test fixtures |
| B | [khanhlinh-jnf/Hashiwokakero](https://github.com/khanhlinh-jnf/Hashiwokakero) | A*, PySAT, backtracking comparisons and evidence |
| C | [aryaman-sakthi/Hashiwokakero](https://github.com/aryaman-sakthi/Hashiwokakero) | Independent graph bridge-puzzle solver |
| C | [TruongNoo/Shakashaka](https://github.com/TruongNoo/Shakashaka) | Vietnamese constrained-grid optimization example |

### F. Non-English tutorials, experimental search platforms and background

| Tier | GitHub repository | Distinct research lead |
|---|---|---|
| C | [zhaohaojie1998/Path-Planning](https://github.com/zhaohaojie1998/Path-Planning) | Chinese search-algorithm examples and comparisons |
| C | [missever/ACM](https://github.com/missever/ACM) | Chinese graph algorithms/Hamiltonian notes |
| B | [txyyss/GridMaze-Algorithm](https://github.com/txyyss/GridMaze-Algorithm) | Chinese grid-maze research and one-stroke design |
| C | [thistle0420/atcoder-game-support](https://github.com/thistle0420/atcoder-game-support) | Japanese one-stroke path puzzle title/algorithm lead |
| B | [ChamaELKHEMSANI/FindPath3D-V2](https://github.com/ChamaELKHEMSANI/FindPath3D-V2) | French-language pathfinding algorithms and controlled benchmarks |
| C | [alcarril/Recursividad-DFS-backtracking-prunning-y-optimizacion](https://github.com/alcarril/Recursividad-DFS-backtracking-prunning-y-optimizacion) | Spanish DFS/backtracking grid constraints walkthrough |
| C | [anmartan/The-Forest](https://github.com/anmartan/The-Forest) | Spanish maze algorithms including revisitation |
| C | [LauraCD2/redes-distribucion-logistica](https://github.com/LauraCD2/redes-distribucion-logistica) | Spanish Hamiltonian constrained route search |
| C | [joaopauloaramuni/fundamentos-de-projeto-e-analise-de-algoritmos](https://github.com/joaopauloaramuni/fundamentos-de-projeto-e-analise-de-algoritmos) | Portuguese Hamiltonian/Knight-tour examples |
| B | [dsagman/picat](https://github.com/dsagman/picat) | Picat CP/SAT/planner models with finite automaton constraints |

**70 concrete repository candidates**, plus four follow-up lineage/code leads below. A number of them are necessarily distant analogues rather than direct implementations of Pathfinder semantics.

### Secondary leads not independently verified as repositories in this pass

- [imos/Puzzle NumberLink](https://github.com/imos/Puzzle/tree/master/NumberLink): referenced by thomasahle for general solution counting.
- [cosminrotariu/Flow_Game](https://github.com/cosminrotariu/Flow_Game): cited as the original team project for copied UAIC repositories.
- [tyfkda Numberlink SAT gist](https://gist.github.com/tyfkda/54dd007cf8607dd2171980b0539500dd): JavaScript logic-solver encoding.
- [beer2011's Japanese Numberlink Lua gists](https://gist.github.com/beer2011): Japanese naming, backtracking and forced-move code.

## What acronyms or names might appear in a title, topic, filename or README?

| Research tradition | Repo-name / acronym / tag seeds |
|---|---|
| Problem classes | CSP; CSPP; RCSP; RCSPP; SPPRC; ESPPRC; ESPP; ESPPTW; SPPTW; WCSP; KSP; k-path; fixed-length walk; non-elementary path; elementary path; Chinese postman; arc routing |
| Constraint languages/engines | CP; CP-SAT; SAT; SMT; QF_BV; PB; PB-SAT; MaxSAT; PBO; MILP; ILP; MIP; CLP(FD); ASP; Z3; MiniSAT; MiniSAT+; OR-Tools; Choco; MiniZinc; Picat; clingo; Gurobi |
| Graph/set encodings | ZDD; BDD; DD; MDD; TdZdd; Graphillion; SIMPATH; frontier DP; frontier-based search; path decomposition; treewidth; state-space augmentation; cutset; transfer matrix |
| Algorithms | DFS; BFS; IDDFS; IDA*; A*; GBFS; LDS; beam; BnB; CDCL; nogood learning; backjump; LNS; meet-in-the-middle; bidirectional labeling; DSSR; ng-path relaxation; Warnsdorff; MRV; AC-3; DLX; CEGAR |
| Puzzle names | Numberlink; Arukone; Flow Free; Zip; The Witness; Slitherlink; Masyu; Mashu; Hashiwokakero; Hashi; Yajilin; Hidato; Hidoku; Numbrix; Knight's Tour; Snakebird; Loop the Loop; One Stroke; One Line |

**More title roots and compound names:** `constrained-path`, `resource-path`, `grid-walk`, `mandatory-nodes`, `exact-length`, `checkpoint`, `multicriteria-route`, `path-enumeration`, `path-count`, `graph-search`, `walk-solver`, `puzzle-sat`, `grid-csp`, `maze-solver`, `loop-solver`, `one-stroke`, `one-line`, `visit-all`, `covering-path`, `reachability`, `state-space`, `symbolic-search`, `graph-set`, `cut-dp`, `frontier-zdd`, `nogood`, `search-prune`, `graph-constraint`, `portal-puzzle`, `turn-constraint`, `tour-solver`, `path-synthesis`, `routing-with-resources`, `directed-path`, `automata-path`, `path-query`.

## Native-language naming and search terms

These are exploratory search seeds, **not certified translations**. Search mixed native script + English algorithm names/acronyms, romanizations and alternative transliterations. A native-language README may describe a project whose repository name is English.

| Language | Query terms |
|---|---|
| English | constrained pathfinding; resource-constrained shortest path; elementary path; non-elementary walk; exact-length walk; prescribed vertices; mandatory waypoints; visit-all; self-intersecting walk; route inspection; graph-set enumeration |
| Español | búsqueda de caminos con restricciones; camino hamiltoniano; recorrido euleriano; laberinto; puntos obligatorios; longitud exacta; retroceso; poda; satisfacción de restricciones |
| Português | busca de caminhos com restrições; caminho hamiltoniano; trilha euleriana; percurso em grade; pontos obrigatórios; comprimento exato; retrocesso; poda |
| Français | recherche de chemin sous contraintes; chemin hamiltonien; parcours eulérien; points de passage obligatoires; longueur exacte; solveur; élagage |
| Deutsch | Pfadsuche mit Nebenbedingungen; Hamiltonpfad; Eulerweg; Gitterpfad; Pflichtknoten; exakte Pfadlänge; Backtracking; Rätsellöser |
| Italiano | ricerca di cammini vincolati; cammino hamiltoniano; cammino euleriano; griglia; punti obbligatori; lunghezza esatta; vincoli |
| Nederlands | padzoeken met beperkingen; Hamiltonpad; Eulerpad; verplichte knooppunten; vaste lengte; puzzeloplosser |
| Polski | wyszukiwanie ścieżek z ograniczeniami; ścieżka Hamiltona; ścieżka Eulera; punkty obowiązkowe; przycinanie; łamigłówka |
| Русский | поиск пути с ограничениями; гамильтонов путь; эйлеров путь; обязательные вершины; путь заданной длины; поиск с возвратом; отсечение ветвей |
| Українська | пошук шляху з обмеженнями; гамільтонів шлях; ейлерів шлях; обов'язкові вершини; пошук з поверненням |
| 简体中文 | 路径规划; 约束路径搜索; 哈密顿路径; 欧拉路径; 一笔画; 网格路径; 必经点; 回溯法; 剪枝; 约束满足; 前沿搜索 |
| 繁體中文 | 路徑規劃; 約束路徑搜尋; 哈密頓路徑; 歐拉路徑; 一筆畫; 必經點; 回溯法; 前沿搜尋 |
| 日本語 | 経路探索; 制約付き経路探索; ハミルトン路; オイラー路; 一筆書き; ナンバーリンク; スリザーリンク; 必ず通るマス; 枝刈り; フロンティア法 |
| 한국어 | 경로 탐색; 제약 경로 탐색; 해밀턴 경로; 오일러 경로; 한붓그리기; 격자 경로; 필수 경유지; 백트래킹; 가지치기 |
| Türkçe | kısıtlı yol bulma; Hamilton yolu; Euler yolu; ızgara yolu; zorunlu düğümler; belirli uzunlukta yol; geri izleme; budama |
| العربية | إيجاد المسار المقيد; مسار هاملتوني; مسار أويلر; نقاط مرور إلزامية; مسار بطول محدد; التراجع; حل الألغاز |
| हिन्दी | बाधित पथ खोज; हैमिल्टन पथ; ऑयलर पथ; ग्रिड पथ; अनिवार्य बिंदु; निश्चित लंबाई वाला पथ; बैकट्रैकिंग |
| Bahasa Indonesia / Melayu | pencarian jalur berkendala; jalur Hamilton; lintasan Euler; jalur kisi; titik wajib; pemangkasan |
| Tiếng Việt | tìm đường có ràng buộc; đường đi Hamilton; đường đi Euler; điểm bắt buộc; độ dài đường đi chính xác; quay lui; cắt tỉa |
| Ελληνικά | εύρεση διαδρομής με περιορισμούς; μονοπάτι Hamilton; διαδρομή Euler; υποχρεωτικές κορυφές; οπισθοδρόμηση |

## Search links for follow-up sweeps

Every row below is a **search query**, not another discovered repository. For each, check repository names/descriptions and code/README separately; repeat with language filters and `site:github.com` web indexing to catch hidden README terms. Prioritize commits/actual code over a headline description.

| # | Repository discovery query | Code/README discovery query |
|---:|---|---|
| 1 | [resource constrained shortest path solver](https://github.com/search?q=resource%20constrained%20shortest%20path%20solver&type=repositories) | [Code search](https://github.com/search?q=resource%20constrained%20shortest%20path%20solver&type=code) |
| 2 | [ESPPRC bidirectional labels](https://github.com/search?q=ESPPRC%20bidirectional%20labels&type=repositories) | [Code search](https://github.com/search?q=ESPPRC%20bidirectional%20labels&type=code) |
| 3 | [SPPRC ng path](https://github.com/search?q=SPPRC%20ng%20path&type=repositories) | [Code search](https://github.com/search?q=SPPRC%20ng%20path&type=code) |
| 4 | [exact length grid path solver](https://github.com/search?q=exact%20length%20grid%20path%20solver&type=repositories) | [Code search](https://github.com/search?q=exact%20length%20grid%20path%20solver&type=code) |
| 5 | [fixed length walk constraints](https://github.com/search?q=fixed%20length%20walk%20constraints&type=repositories) | [Code search](https://github.com/search?q=fixed%20length%20walk%20constraints&type=code) |
| 6 | [revisit vertices path solver](https://github.com/search?q=revisit%20vertices%20path%20solver&type=repositories) | [Code search](https://github.com/search?q=revisit%20vertices%20path%20solver&type=code) |
| 7 | [Hamiltonian path waypoint grid](https://github.com/search?q=Hamiltonian%20path%20waypoint%20grid&type=repositories) | [Code search](https://github.com/search?q=Hamiltonian%20path%20waypoint%20grid&type=code) |
| 8 | [Hamiltonian grid parity](https://github.com/search?q=Hamiltonian%20grid%20parity&type=repositories) | [Code search](https://github.com/search?q=Hamiltonian%20grid%20parity&type=code) |
| 9 | [self avoiding walk enumeration](https://github.com/search?q=self%20avoiding%20walk%20enumeration&type=repositories) | [Code search](https://github.com/search?q=self%20avoiding%20walk%20enumeration&type=code) |
| 10 | [mandatory waypoints backtracking](https://github.com/search?q=mandatory%20waypoints%20backtracking&type=repositories) | [Code search](https://github.com/search?q=mandatory%20waypoints%20backtracking&type=code) |
| 11 | [turn constrained path grid](https://github.com/search?q=turn%20constrained%20path%20grid&type=repositories) | [Code search](https://github.com/search?q=turn%20constrained%20path%20grid&type=code) |
| 12 | [direction constrained graph walk](https://github.com/search?q=direction%20constrained%20graph%20walk&type=repositories) | [Code search](https://github.com/search?q=direction%20constrained%20graph%20walk&type=code) |
| 13 | [portal puzzle solver](https://github.com/search?q=portal%20puzzle%20solver&type=repositories) | [Code search](https://github.com/search?q=portal%20puzzle%20solver&type=code) |
| 14 | [flipper constraint path](https://github.com/search?q=flipper%20constraint%20path&type=repositories) | [Code search](https://github.com/search?q=flipper%20constraint%20path&type=code) |
| 15 | [exact intersections walk](https://github.com/search?q=exact%20intersections%20walk&type=repositories) | [Code search](https://github.com/search?q=exact%20intersections%20walk&type=code) |
| 16 | [crossing count puzzle path](https://github.com/search?q=crossing%20count%20puzzle%20path&type=repositories) | [Code search](https://github.com/search?q=crossing%20count%20puzzle%20path&type=code) |
| 17 | [visit count SAT graph](https://github.com/search?q=visit%20count%20SAT%20graph&type=repositories) | [Code search](https://github.com/search?q=visit%20count%20SAT%20graph&type=code) |
| 18 | [region connectivity path puzzle](https://github.com/search?q=region%20connectivity%20path%20puzzle&type=repositories) | [Code search](https://github.com/search?q=region%20connectivity%20path%20puzzle&type=code) |
| 19 | [degree forced puzzle loop](https://github.com/search?q=degree%20forced%20puzzle%20loop&type=repositories) | [Code search](https://github.com/search?q=degree%20forced%20puzzle%20loop&type=code) |
| 20 | [frontier based search path ZDD](https://github.com/search?q=frontier%20based%20search%20path%20ZDD&type=repositories) | [Code search](https://github.com/search?q=frontier%20based%20search%20path%20ZDD&type=code) |
| 21 | [frontier DP Hamiltonian](https://github.com/search?q=frontier%20DP%20Hamiltonian&type=repositories) | [Code search](https://github.com/search?q=frontier%20DP%20Hamiltonian&type=code) |
| 22 | [SIMPATH grid](https://github.com/search?q=SIMPATH%20grid&type=repositories) | [Code search](https://github.com/search?q=SIMPATH%20grid&type=code) |
| 23 | [Graphillion Numberlink](https://github.com/search?q=Graphillion%20Numberlink&type=repositories) | [Code search](https://github.com/search?q=Graphillion%20Numberlink&type=code) |
| 24 | [BDD constrained search](https://github.com/search?q=BDD%20constrained%20search&type=repositories) | [Code search](https://github.com/search?q=BDD%20constrained%20search&type=code) |
| 25 | [regular path query automata](https://github.com/search?q=regular%20path%20query%20automata&type=repositories) | [Code search](https://github.com/search?q=regular%20path%20query%20automata&type=code) |
| 26 | [SAT Numberlink](https://github.com/search?q=SAT%20Numberlink&type=repositories) | [Code search](https://github.com/search?q=SAT%20Numberlink&type=code) |
| 27 | [SMT puzzle paths](https://github.com/search?q=SMT%20puzzle%20paths&type=repositories) | [Code search](https://github.com/search?q=SMT%20puzzle%20paths&type=code) |
| 28 | [CP-SAT grid loop](https://github.com/search?q=CP-SAT%20grid%20loop&type=repositories) | [Code search](https://github.com/search?q=CP-SAT%20grid%20loop&type=code) |
| 29 | [MiniZinc Hamiltonian](https://github.com/search?q=MiniZinc%20Hamiltonian&type=repositories) | [Code search](https://github.com/search?q=MiniZinc%20Hamiltonian&type=code) |
| 30 | [Picat maze planner](https://github.com/search?q=Picat%20maze%20planner&type=repositories) | [Code search](https://github.com/search?q=Picat%20maze%20planner&type=code) |
| 31 | [clingo puzzle solver](https://github.com/search?q=clingo%20puzzle%20solver&type=repositories) | [Code search](https://github.com/search?q=clingo%20puzzle%20solver&type=code) |
| 32 | [Flow Free solver](https://github.com/search?q=Flow%20Free%20solver&type=repositories) | [Code search](https://github.com/search?q=Flow%20Free%20solver&type=code) |
| 33 | [Arukone solver](https://github.com/search?q=Arukone%20solver&type=repositories) | [Code search](https://github.com/search?q=Arukone%20solver&type=code) |
| 34 | [Zip puzzle solver](https://github.com/search?q=Zip%20puzzle%20solver&type=repositories) | [Code search](https://github.com/search?q=Zip%20puzzle%20solver&type=code) |
| 35 | [The Witness solver](https://github.com/search?q=The%20Witness%20solver&type=repositories) | [Code search](https://github.com/search?q=The%20Witness%20solver&type=code) |
| 36 | [Slitherlink solver](https://github.com/search?q=Slitherlink%20solver&type=repositories) | [Code search](https://github.com/search?q=Slitherlink%20solver&type=code) |
| 37 | [Masyu solver](https://github.com/search?q=Masyu%20solver&type=repositories) | [Code search](https://github.com/search?q=Masyu%20solver&type=code) |
| 38 | [Hashiwokakero solver](https://github.com/search?q=Hashiwokakero%20solver&type=repositories) | [Code search](https://github.com/search?q=Hashiwokakero%20solver&type=code) |
| 39 | [Hidato solver](https://github.com/search?q=Hidato%20solver&type=repositories) | [Code search](https://github.com/search?q=Hidato%20solver&type=code) |
| 40 | [Yajilin solver](https://github.com/search?q=Yajilin%20solver&type=repositories) | [Code search](https://github.com/search?q=Yajilin%20solver&type=code) |
| 41 | [One Stroke solver](https://github.com/search?q=One%20Stroke%20solver&type=repositories) | [Code search](https://github.com/search?q=One%20Stroke%20solver&type=code) |
| 42 | [One Line puzzle path](https://github.com/search?q=One%20Line%20puzzle%20path&type=repositories) | [Code search](https://github.com/search?q=One%20Line%20puzzle%20path&type=code) |
| 43 | [cut vertex path pruning](https://github.com/search?q=cut%20vertex%20path%20pruning&type=repositories) | [Code search](https://github.com/search?q=cut%20vertex%20path%20pruning&type=code) |
| 44 | [nogood learning pathfinding](https://github.com/search?q=nogood%20learning%20pathfinding&type=repositories) | [Code search](https://github.com/search?q=nogood%20learning%20pathfinding&type=code) |
| 45 | [dominance resource constrained paths](https://github.com/search?q=dominance%20resource%20constrained%20paths&type=repositories) | [Code search](https://github.com/search?q=dominance%20resource%20constrained%20paths&type=code) |
| 46 | [CSP puzzle graph connectivity](https://github.com/search?q=CSP%20puzzle%20graph%20connectivity&type=repositories) | [Code search](https://github.com/search?q=CSP%20puzzle%20graph%20connectivity&type=code) |
| 47 | [poda camino hamiltoniano](https://github.com/search?q=poda%20camino%20hamiltoniano&type=repositories) | [Code search](https://github.com/search?q=poda%20camino%20hamiltoniano&type=code) |
| 48 | [caminho hamiltoniano restrições](https://github.com/search?q=caminho%20hamiltoniano%20restri%C3%A7%C3%B5es&type=repositories) | [Code search](https://github.com/search?q=caminho%20hamiltoniano%20restri%C3%A7%C3%B5es&type=code) |
| 49 | [chemin hamiltonien grille](https://github.com/search?q=chemin%20hamiltonien%20grille&type=repositories) | [Code search](https://github.com/search?q=chemin%20hamiltonien%20grille&type=code) |
| 50 | [Hamiltonpfad Rätsel](https://github.com/search?q=Hamiltonpfad%20R%C3%A4tsel&type=repositories) | [Code search](https://github.com/search?q=Hamiltonpfad%20R%C3%A4tsel&type=code) |
| 51 | [гамильтонов путь головоломка](https://github.com/search?q=%D0%B3%D0%B0%D0%BC%D0%B8%D0%BB%D1%8C%D1%82%D0%BE%D0%BD%D0%BE%D0%B2%20%D0%BF%D1%83%D1%82%D1%8C%20%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BE%D0%BB%D0%BE%D0%BC%D0%BA%D0%B0&type=repositories) | [Code search](https://github.com/search?q=%D0%B3%D0%B0%D0%BC%D0%B8%D0%BB%D1%8C%D1%82%D0%BE%D0%BD%D0%BE%D0%B2%20%D0%BF%D1%83%D1%82%D1%8C%20%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BE%D0%BB%D0%BE%D0%BC%D0%BA%D0%B0&type=code) |
| 52 | [一笔画 求解 回溯](https://github.com/search?q=%E4%B8%80%E7%AC%94%E7%94%BB%20%E6%B1%82%E8%A7%A3%20%E5%9B%9E%E6%BA%AF&type=repositories) | [Code search](https://github.com/search?q=%E4%B8%80%E7%AC%94%E7%94%BB%20%E6%B1%82%E8%A7%A3%20%E5%9B%9E%E6%BA%AF&type=code) |
| 53 | [路径 剪枝 必经点](https://github.com/search?q=%E8%B7%AF%E5%BE%84%20%E5%89%AA%E6%9E%9D%20%E5%BF%85%E7%BB%8F%E7%82%B9&type=repositories) | [Code search](https://github.com/search?q=%E8%B7%AF%E5%BE%84%20%E5%89%AA%E6%9E%9D%20%E5%BF%85%E7%BB%8F%E7%82%B9&type=code) |
| 54 | [前沿搜索 路径](https://github.com/search?q=%E5%89%8D%E6%B2%BF%E6%90%9C%E7%B4%A2%20%E8%B7%AF%E5%BE%84&type=repositories) | [Code search](https://github.com/search?q=%E5%89%8D%E6%B2%BF%E6%90%9C%E7%B4%A2%20%E8%B7%AF%E5%BE%84&type=code) |
| 55 | [ナンバーリンク 解法](https://github.com/search?q=%E3%83%8A%E3%83%B3%E3%83%90%E3%83%BC%E3%83%AA%E3%83%B3%E3%82%AF%20%E8%A7%A3%E6%B3%95&type=repositories) | [Code search](https://github.com/search?q=%E3%83%8A%E3%83%B3%E3%83%90%E3%83%BC%E3%83%AA%E3%83%B3%E3%82%AF%20%E8%A7%A3%E6%B3%95&type=code) |
| 56 | [一筆書き ソルバー](https://github.com/search?q=%E4%B8%80%E7%AD%86%E6%9B%B8%E3%81%8D%20%E3%82%BD%E3%83%AB%E3%83%90%E3%83%BC&type=repositories) | [Code search](https://github.com/search?q=%E4%B8%80%E7%AD%86%E6%9B%B8%E3%81%8D%20%E3%82%BD%E3%83%AB%E3%83%90%E3%83%BC&type=code) |
| 57 | [フロンティア法 経路](https://github.com/search?q=%E3%83%95%E3%83%AD%E3%83%B3%E3%83%86%E3%82%A3%E3%82%A2%E6%B3%95%20%E7%B5%8C%E8%B7%AF&type=repositories) | [Code search](https://github.com/search?q=%E3%83%95%E3%83%AD%E3%83%B3%E3%83%86%E3%82%A3%E3%82%A2%E6%B3%95%20%E7%B5%8C%E8%B7%AF&type=code) |
| 58 | [경로 탐색 백트래킹](https://github.com/search?q=%EA%B2%BD%EB%A1%9C%20%ED%83%90%EC%83%89%20%EB%B0%B1%ED%8A%B8%EB%9E%98%ED%82%B9&type=repositories) | [Code search](https://github.com/search?q=%EA%B2%BD%EB%A1%9C%20%ED%83%90%EC%83%89%20%EB%B0%B1%ED%8A%B8%EB%9E%98%ED%82%B9&type=code) |
| 59 | [kısıtlı yol bulma](https://github.com/search?q=k%C4%B1s%C4%B1tl%C4%B1%20yol%20bulma&type=repositories) | [Code search](https://github.com/search?q=k%C4%B1s%C4%B1tl%C4%B1%20yol%20bulma&type=code) |
| 60 | [tìm đường có ràng buộc](https://github.com/search?q=t%C3%ACm%20%C4%91%C6%B0%E1%BB%9Dng%20c%C3%B3%20r%C3%A0ng%20bu%E1%BB%99c&type=repositories) | [Code search](https://github.com/search?q=t%C3%ACm%20%C4%91%C6%B0%E1%BB%9Dng%20c%C3%B3%20r%C3%A0ng%20bu%E1%BB%99c&type=code) |

## Highest-value next inspections

1. **Frontier/ZDD:** `junkawahara/frontier_basic_tdzdd`, `junkawahara/frontier`, `graphillion/graphillion` and `kunisura/TdZdd`. A path *family* representation could amortize reasoning across many candidates. Test on tiny exact Pathfinder projections before proposing a full-history representation; one-pass simple paths may be incompatible with intersections and flippers.
2. **Alternative search object:** `thomasahle/numberlink` implements diagonal partial-link filling and a dual-corner representation. Compare against current Pathfinder forward-prefix representation. Seek a cheaply demonstrable new necessary condition, not an architectural rewrite by analogy.
3. **Incremental regions:** `Overv/TheWitnessSolver` and `RainbowwPhoenixx/witness-solver` include region-sealing and incremental constraints. Ask whether they add a sound obligation/cut inference beyond existing connectivity, BC1 and bridge-excursion checks.
4. **Multiple resources:** `idea-idsia/pathwyse`, `torressa/cspy` and `sharabhshukla/route-pricer` supply bidirectional labels, dominance, state-space relaxations and resource extensions. Pathfinder's history-dependent future legality means ordinary dominance can fail; require an explicit semantic proof.
5. **Exact reference models:** `tuneerroy/numberlink`, `leophagus/Flow-Free-Solver`, `s5bug/flowsolver`, `SmilingWayne/puzzlekit` and `uguryavuz/numberlink-solver` suggest independent SAT/SMT/CP encodings for small-level reference labels, distinct from cold production policy.
6. **Transfer mechanics and evidence:** `chi-feng/zip-solver`, `CWSwastik/zip-solver`, `JonathanGun/masyu-solver`, `praveenkulkarni1996/slitherlinky`, `simon-frankau/hashiwokakero-solver`, and `jsnell/snakebird-solver` provide forced moves, turn restrictions, parity, degree arguments, compact states and reproducible ablation ideas.

## Intake and evidence standard

Record `repository URL`, default branch, inspected commit SHA, active code path, license, language, upstream lineage/forks, example instances, claimed versus reproduced behavior and a *specific* Pathfinder-mechanic mapping before treating a hit as prior art. Capture a minimal counterexample for incompatible assumptions (especially no revisits, edge-vs-vertex crossing, portal length, global flipper parity). Source marketing claims do not count as benchmark results.

Before opening a treatment or allocating a large campaign: query the existing research-status index/tooling census, cross-check the workstreams, premise atlas and future-work reopen conditions; name the falsifiable discriminator and cheapest control-only test. Use controlled parent × permutation × technique comparisons (PG-G) where appropriate. Preserve independent units, equal `workSpent`, cold level-blindness, prospective selection and independent exact/referee validation. A negative transfer is valuable if it establishes exactly why a mathematical idea is unsound or uneconomic.

This dated file **does not own research priority, scientific verdicts, asset contracts or treatment status**. Promote only concrete, newly tested facts into their existing authorities, rather than inflating the active solver queue from search results alone.
