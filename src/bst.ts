export class BSTNode<T> {
    public left: BSTNode<T> | null;
    public right: BSTNode<T> | null;

    constructor(public value: T) {
        this.left = null;
        this.right = null;
    }
}

export class BST<T> {
    private root: BSTNode<T> | null;

    constructor() {
        this.root = null;
    }

    public insert(value: T): void {
        const newNode = new BSTNode(value);

        if (this.root === null) {
            this.root = newNode;
            return;
        }

        let current = this.root;
        while (true) {
            if (value < current.value) {
                if (current.left === null) {
                    current.left = newNode;
                    return;
                }
                current = current.left;
            } else {
                if (current.right === null) {
                    current.right = newNode;
                    return;
                }
                current = current.right;
            }
        }
    }

    public inOrder(): T[] {
        const result: T[] = [];

        function traverse(node: BSTNode<T> | null): void {
            if (node === null) return;
            traverse(node.left);
            result.push(node.value);
            traverse(node.right);
        }

        traverse(this.root);
        return result;
    }
}