# diffsync
This implements a simple collaborative editor for the web

It implements collaborative text editing via git's [recursive 3-way merge algorithm](https://public-inbox.org/git/20050826184731.GA13629@c165.ib.student.liu.se/).  This is how git merges big commits of source code. I bet you never thought it could be used for merging single-keystroke edits together!

It's actually remarkable fast, too, because it uses the amazing Myer's algorithm for the diffing!

See the index.html file for an example usage.

We [hypothesize](https://stackoverflow.com/a/48652362/440344) that this algorithm actually can be proven to be a CRDT, by observing that each recursive merge creates a least-upper-bound within a semilattice.
