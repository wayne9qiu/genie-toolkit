// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

/**
 * Standard max-heap-based priority queue.
 *
 * Elements must be object and are sorted according to their `priority` property.
 * Ties are broken by insertion order.
 */
class PriorityQueue {
    constructor() {
        this._storage = [];
    }

    get size() {
        return this._storage.length;
    }

    _getParent(node) {
        return Math.floor((node-1)/2);
    }
    _getLeftChild(node) {
        return 2*node+1;
    }
    _getRightChild(node) {
        return 2*node+2;
    }
    _swap(a, b) {
        const tmp = this._storage[a];
        this._storage[a] = this._storage[b];
        this._storage[b] = tmp;
    }

    push(element) {
        let node = this._storage.length;
        this._storage.push(element);

        // adjust the heap invariant:
        // move the new node up the tree until the parent is higher

        while (node > 0) {
            const parent = this._getParent(node);
            const pvalue = this._storage[parent];
            // break ties by keeping the current parent (which was older)
            if (pvalue.priority < element.priority) {
                this._swap(node, parent);
                node = parent;
            } else {
                break;
            }
        }
    }

    peek() {
        return this._storage[0];
    }

    pop() {
        if (this._storage.length === 0)
            return undefined;

        // swap the first and the last element
        this._swap(0, this._storage.length-1);
        let toReturn = this._storage.pop();

        // adjust the heap invariant by pushing down the top element
        // (which is now misplaced)
        let node = 0;
        let top = this._storage[node];
        while (node < this._storage.length-1) {
            const lchild = this._getLeftChild(node);
            const rchild = this._getRightChild(node);

            if (lchild >= this._storage.length)
                break;
            if (rchild >= this._storage.length) {
                const lvalue = this._storage[lchild];
                // break ties by pushing top back down where it came from
                if (lvalue.priority >= top.priority)
                    this._swap(lchild, node);
                // lchild is exactly the last element in the priority queue, so we're done
                break;
            }

            const lvalue = this._storage[lchild];
            const rvalue = this._storage[rchild];
            // break ties by pushing top back down where it came from
            if (lvalue.priority >= top.priority &&
                rvalue.priority >= top.priority) {
                // both are incorrect, pick the highest one
                // break ties by picking the left one (which was older)
                if (rvalue.priority > lvalue.priority) {
                    this._swap(rchild, node);
                    node = rchild;
                } else {
                    this._swap(lchild, node);
                    node = lchild;
                }
            } else if (lvalue.priority >= top.priority) {
                // the left is incorrect, move it up
                this._swap(lchild, node);
                node = lchild;
            } else if (rvalue.priority >= top.priority) {
                // the right is incorrect, move it up
                this._swap(rchild, node);
                node = rchild;
            } else {
                // everything is good!
                break;
            }
        }

        return toReturn;
    }
}
module.exports = PriorityQueue;
