import { BlockPermutation } from "@minecraft/server";

export async function runBenchmark(dimension, location) {
    console.warn("Starting Benchmark...");

    // Test A: runCommandAsync
    const startA = Date.now();
    const promisesA = [];
    for (let i = 0; i < 100; i++) {
        promisesA.push(dimension.runCommandAsync(`setblock ${location.x} ${location.y} ${location.z} minecraft:stone`));
    }
    await Promise.all(promisesA);
    const endA = Date.now();
    console.warn(`Test A (runCommandAsync) took: ${endA - startA}ms`);

    // Test B: block.setPermutation
    const startB = Date.now();
    const block = dimension.getBlock(location);
    const permutation = BlockPermutation.resolve("minecraft:stone");
    for (let i = 0; i < 100; i++) {
        block.setPermutation(permutation);
    }
    const endB = Date.now();
    console.warn(`Test B (setPermutation) took: ${endB - startB}ms`);

    console.warn("Benchmark Complete.");
}
