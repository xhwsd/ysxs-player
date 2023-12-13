import { LABEL, VERSION, YsxsPlayerElement } from './player.js';

// 注册元素
if (!window.YsxsPlayerElement) {
	// 定义自定义元素，注意元素标签名必须含一个破折号（-）
	if (window.customElements && !window.customElements.get(LABEL)) {
		console.log(
			`%c ${LABEL} %c v${VERSION} %c https://github.com/xhwsd/${LABEL}`,
			'color: #fff; background: #5f5f5f',
			'color: #fff; background: #70c6be',
			''
		);
		window.YsxsPlayerElement = YsxsPlayerElement;
		window.customElements.define(LABEL, YsxsPlayerElement);
	}
}

/**
 * 派生元素方法：
 * 解决alist的md文档中定义ysxs-player元素后无属性
 * 通过预定义div元素及其属性动态派生出ysxs-player元素
 */
export function ysxs() {
	YsxsPlayerElement.derive();
}
