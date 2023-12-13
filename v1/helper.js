/**
 * 辅助模块
 * 
 * @author 东子 <xhwsd@qq.com>
 * @since 1.0.0 2021-5-9
 */
export class Helper {
	/**
	 * 派生元素 - 基于容器元素创建子级元素
	 * 
	 * @param {string} label 标签；容器元素的id、子级元素的类型
	 * @param {string} prefix 前缀；属性名称前缀
	 */
	static deriveElement(label, prefix) {
		// 支持div标签定义，解决alist中 markdown文档无法完整转换子元素
		let container = document.getElementById(label);   
		if (container && !container.querySelector(label)) {
			// 动态创建子级元素
			let element = document.createElement(label);
			for (let i = 0; i < container.attributes.length; i++) {
				let attribute = container.attributes[i];
				if (attribute.name.indexOf(prefix) === 0) {
					element.setAttribute(attribute.name.slice(prefix.length), attribute.value);
				}
			}
			container.appendChild(element);
		}
	}

	/**
	 * 小驼峰属性 - 将短横线名（xxx-xxx-xxx）元素属性转为小驼峰属性（xxxXxxXxx）
	 * 
	 * @param {object} attributes 元素属性
	 * @param {object} 元素属性
	 */
	static camelizeAttributes(attributes) {
		let result = {};
		for (var i = 0; i < attributes.length; i++) {
			result[this.camelize(attributes[i].name)] = attributes[i].value;
		}
		return result;
	}

	/**
	 * 小驼峰命名
	 * 
	 * @param {string} content 内容
	 * @return {string} 转换结果
	 */
	static camelize(content) {
		// 如：list-max-height转为listMaxHeight
		return content.replace(/^[_.\- ]+/, '') // 移除开头 _ . -
			.toLowerCase() // 全部到小写 
			// 替换 _ . - 后续一个字符转大写
			.replace(
				/[_.\- ]+(\w|$)/g,
				(m, p1) => p1.toUpperCase()
			); 
	}

	/**
	 * 比对
	 * 
	 * @param {boolean} asc 升序，是否升序排序 true 为升序，false为降序
	 * @param {callback} callback 回调
	 * @return {number}
	 */
	static compare(asc, callback) {
		if (asc === undefined) {
			asc = 1;
		} else {
			asc = (asc) ? 1 : -1;
		}

		return function(item1, item2) {
			let value1 = callback(item1);
			let value2 = callback(item2);
			
			let number1 = Number(value1);
			let number2 = Number(value2);
			if (isNaN(number1) || isNaN(number2)) {
				return value1.localeCompare(value2, 'zh-CN', { numeric: true });
			} else {
				if (number1 < number2) {
					return asc * -1;
				} else if (number1 > number2) {
					return asc * 1;
				} else {
					return 0;
				}
			}
		}
	}

	/**
	 * 填充
	 * 
	 * @param {number} number 数值
	 * @param {number} length 长度
	 * @return {string} 结果
	 */
	static padding(number, length) {
	   return (Array(length).join('0') + number).slice(-length);
	}

	/**
	 * 去除开头关键字
	 * 
	 * @param {string} content 内容
	 * @param {string} keyword 关键字 
	 * @return {string} 结果
	 */
	static removeStart(content, keyword = '/') {

		if (content.slice(0, keyword.length) === keyword) {
		   return content.slice(keyword.length, content.length - keyword.length + 1);
		} else {
			return content;
		}
	}

	/**
	 * 去除结尾关键字
	 * 
	 * @param {string} content 内容
	 * @param {string} keyword 关键字 
	 * @return {string} 结果
	 */
	static removeEnd(content, keyword = '/') {
		if (content.slice(-keyword.length) === keyword) {
			return content.slice(0, content.length - keyword.length);
		} else {
			return content;
		}
	}

	/**
	 * 删除边界关键字
	 * 
	 * @param {string} content 内容
	 * @param {string} keyword 关键字 
	 * @return {string} 结果
	 */
	static removeBorder(content, keyword = '/') {
		return this.removeEnd(this.removeStart(content, keyword), keyword);
	}
	
	/**
	 * 补全开头关键字
	 * 
	 * @param {string} content 内容
	 * @param {string} keyword 关键字 
	 * @return {string} 结果
	 */
	static completeStart(content, keyword = '/') {
		if (content.slice(0, keyword.length) !== keyword) {
		   return keyword + content;
		} else {
			return content;
		}
	}

	/**
	 * 补全结尾关键字
	 * 
	 * @param {string} content 内容
	 * @param {string} keyword 关键字
	 * @return {string} 结果
	 */
	static completeEnd(content, keyword = '/') {
		if (content.slice(-keyword.length) !== keyword) {
			return content + keyword;
		} else {
			return content;
		}
	}

	/**
	 * 补全边界关键字
	 * 
	 * @param {string} content 内容
	 * @param {string} keyword 关键字 
	 * @return {string} 结果
	 */
	static completeBorder(content, keyword = '/') {
		return this.completeEnd(this.completeStart(content, keyword), keyword);
	}

	/**
	 * 加载CSS
	 * 
	 * @param {string} url 网址
	 * @return {Promise<HTMLLinkElement>|HTMLLinkElement}
	 */
	static async loadCss(url) {
		let element = document.querySelector('link[href="' + url + '"]');
		if (element) {
			return element;
		} else {
			return new Promise(function(resolve, reject) {
				let element = document.createElement('link');
				element.type ='text/css';
				element.rel = 'stylesheet';
				element.href = url;
				element.onload = element.onreadystatechange = function() {
					if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
						element.onload = element.onreadystatechange = null;
						resolve(element);
					}
				}
				element.onerror = function() {
					reject(new Error(`CSS(${url})加载失败`));
				}
				document.head.appendChild(element);
			});
		}
	}

	/**
	 * 加载JS
	 * 
	 * @param {string} url 网址
	 * @return {Promise<HTMLScriptElement>|HTMLScriptElement}
	 */
	static async loadJs(url) {
		let element = document.querySelector('script[src="' + url + '"]');
		if (element) {
			return element;
		} else {
			return new Promise(function(resolve, reject) {
				let element = document.createElement('script');
				element.type = 'text/javascript';
				element.src = url;
				element.onload = element.onreadystatechange = function() {
					if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
						element.onload = element.onreadystatechange = null;
						resolve(element);
					}
				}
				element.onerror = function() {
					reject(new Error(`JS(${url})加载失败`));
				}
				document.head.appendChild(element);
			});
		}
	}
}