function extractBaseId(exactId) {
	if (!exactId) return exactId;
	const parts = exactId.split("_");
	return parts[0];
}
console.log(extractBaseId("f28_s1_1"));
