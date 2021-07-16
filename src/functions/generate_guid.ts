export default function generateGUID(): string {
	let sectionLength = Date.now();
	const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = Math.floor((sectionLength + Math.random() * 16) % 16);
		sectionLength = Math.floor(sectionLength / 16);
		const _guid = (c == 'x' ? r : (r & 7) | 8).toString(16);
		return _guid;
	});
	return id;
}
