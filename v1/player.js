/*
文档
aplayer https://aplayer.js.org/#/zh-Hans/
MetingJS https://github.com/metowolf/MetingJS
音频 https://www.runoob.com/tags/ref-av-dom.html
JavaScript教程 https://www.runoob.com/js/js-tutorial.html

Alist https://atlist-v3.apifox.cn/
Fetch https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API
*/

import { Helper } from './helper.js';
import { Alist } from './alist.js';

/** 元素标签；注意必须含一个破折号（-） */
export const LABEL = 'ysxs-player';
/** 版本 */
export const VERSION = '1.0.3'
/** 属性前缀 */
const PREFIX = 'ysxs-';
/** APlayer.css网址 */
const APLAYER_CSS = '//cdn.staticfile.org/aplayer/1.10.1/APlayer.min.css';
/** APlayer.js网址 */
const APLAYER_JS = '//cdn.staticfile.org/aplayer/1.10.1/APlayer.min.js';

/**
 * 有声小说播放器元素
 * 
 * @author 东子 <xhwsd@qq.com>
 * @since 1.0.0 2021-5-9
 */
export class YsxsPlayerElement extends HTMLElement {
	/**
	 * 连接回调
	 */
	connectedCallback() {
		// 属性转选项
		this.options = Helper.camelizeAttributes(this.attributes);
		this.debug('初始属性选项', '选项:', this.options);

		// 文档编辑
		if (decodeURI(window.location.pathname).slice(-3) === '.md') {
			this.debug('正在浏览文档...');
			return;
		}

		// 检验专辑
		if (!this.getAlbumPath()) {
			this.error('专辑路径无效');
			return;
		}

		// 初始化ALIST
		this.alist = new Alist(this.getAlistUrl());

		// 资源加载
		Promise.all([
			Helper.loadCss(APLAYER_CSS),
			Helper.loadJs(APLAYER_JS),
			this.getTrackList(),
			this.getCoverUrl()
		]).then((results) => {
			// 结果和索引数组索引对应
			this.debug('资源加载成功', '音频数量:', results[2].length);
			this.initPlayer(this.toAudioList(results[2], results[3]));
		}).catch((error) => {
			this.error('资源加载失败', error);
		});
	}

	/**
	 * 断开回调
	 */
	disconnectedCallback() {
		this.debug('元素对象已断开');

		// 清空列表，解决报错
		if (this.aplayer) {
			this.aplayer.list.clear();
			this.aplayer.destroy();
		}
	}

	/**
	 * 取轨道列表
	 * 
	 * @return {Array} 成功列表，失败返回空数组
	 */
	async getTrackList() {
		// 取ALIST文件
		let promises = [];
		let paths = this.getTrackPaths();
		paths.forEach((path) => {
			promises.push(this.alist.getFileList(
				this.getAlbumPath() + path,
				this.getAlbumPassword()
			));
		});

		// 等待异步
		let contents = await Promise.all(promises).then((results) => {
			let contents = [];
			results.forEach((result, index) => {
				result.content.forEach((item) => {
					// 附加路径
					item.path = paths[index];
				});
				contents.push(...result.content);
			});
			return contents;
		});

		// 筛选内容
		contents = contents.filter((item) => {
			// 过滤掉目录
			if (item.is_dir) return false
			// 其它过滤...
			return true
		});

		// 对列表进行排序
		contents = contents.sort(Helper.compare(true, (item) => {
			return this.parseTrackOrder(item.name);
		}));
		return contents;
	}

	/**
	 * 取封面网址
	 * 
	 * @return {string} 网址
	 */
	async getCoverUrl() {
		let path = this.getCoverPath();
		if (path) {
			let data = await this.alist.getFileInfo(
				this.getAlbumPath() + path,
				this.getAlbumPassword()
			);
			return data.raw_url;
		}
		return '';
	}

	/**
	 * 初始播放器
	 * @param {array} list 列表
	 * @return {window.APlayer} 播放器
	 */
	initPlayer(list) {
		// 创建div并添加到子级
		let div = document.createElement('div');
		this.appendChild(div);

		// 创建播放器
		let aplayer = new window.APlayer({
			// 播放器容器元素
			container: div,
			// 开启吸底模式
			fixed: parseInt(this.options.playerFixed || 0) ? true : false,
			// 列表默认折叠
			listFolded: parseInt(this.options.playerListFolded || 0) ? true : false,
			// 列表最大高度
			listMaxHeight: this.options.playerListMaxHeight || '300px',
			// 音频列表
			audio: list,
		});
		this.aplayer = aplayer;

		// 恢复播放索引
		this.queryPlayerIndex((index) => {
			if (index >= 0 && index <= list.length) {
				// 切换播放索引
				if (index > 0) aplayer.list.switch(index);
				this.restoreStatus = 1;
				this.debug('恢复播放索引', '索引:', index);
			}
		});

		// 播放
		aplayer.on('play', () => {
			// 保存播放索引
			this.savePlayerIndex(aplayer.list.index);
		});

		// 暂停
		aplayer.on('pause', () => {
			// 保存播放时间
			this.savePlayerTime(aplayer.audio.currentTime);
		});

		// 位置改变
		aplayer.on('timeupdate', () => {
			// 记录播放时间
			if (!aplayer.audio.paused) {
				this.savePlayerTime(aplayer.audio.currentTime);
			};
		});

		// 元数据加载
		aplayer.on('loadedmetadata', () => {
			// 恢复播放时间
			if (this.restoreStatus === 1) {
				this.queryPlayerTime((time) => {
					let duration = aplayer.audio.duration;
					if (time && duration && time <= duration) {
						// 跳转播放时间
						aplayer.seek(time);
						this.debug('恢复播放时间', '时间:', time);
					}
				});

				// 无论是否恢复，仅执行一次
				this.restoreStatus = 2;
			}
		});
		return aplayer;
	}

	/**
	 * 取Aliat地址
	 * 
	 * @return {string}
	 */
	getAlistUrl() {
		return this.options.alistUrl || window.location.origin;
	}

	/**
	 * 取专辑路径
	 * 
	 * @return {string}
	 */
	getAlbumPath() {
		let path = this.options.albumPath || decodeURI(window.location.pathname);
		// 去除末尾的反斜杠
		if (path.length > 2) {
			path = Helper.removeEnd(path)
		}
		return path;
	}

	/**
	 * 取专辑密码
	 * 
	 * @return {string}
	 */
	getAlbumPassword() {
		return this.options.albumPassword || '';
	}

	/**
	 * 取专辑名称
	 * 
	 * @return {string}
	 */
	getAlbumName() {
		return this.options.albumName || '';
	}

	/**
	 * 取音轨路径
	 * 
	 * @return {Array<string>}
	 */
	getTrackPaths() {
		let trackPaths = (this.options.trackPath || '/track').split('|');
		return trackPaths;
	}
	
	/**
	 * 到音频列表
	 * 
	 * @param {array} contents 内容
	 * @param {string} cover 封面
	 * @return {array} 列表
	 */
	toAudioList(contents, cover = '') {
		let result = [];
		contents.forEach((content) => {
			// 忽略目录
			if (content.is_dir) return;
			// 插入音频项
			result.push({
				// 音频名称
				name: this.getAudioName(content),
				// 音频艺术家
				artist: this.getArtistName(),
				// 音频地址
				url: this.getAudioUrl(content),
				// 音频封面
				cover: cover
			});
		});
		return result;
	}

	/**
	 * 取音频名称
	 * 
	 * @param {object} content 内容
	 * @return {string}
	 */
	getAudioName(content) {
		return [
			this.getAlbumName(),
			this.parseTrackName(content.name) || content.name
		].join(' ')
	}

	/**
	 * 取音频网址
	 * 
	 * @param {object} content 内容
	 * @return {string}
	 */
	getAudioUrl(content) {
		// content.path 是自定义属性
		return this.alist.getDownloadUrl(this.getAlbumPath() + content.path, content);
	}

	/**
	 * 取主播名称
	 * 
	 * @return {string}
	 */
	getArtistName() {
		return this.options.artistName || '';
	}

	/**
	 * 取封面路径
	 * 
	 * @return {string}
	 */
	getCoverPath() {
		return this.options.coverPath || '';
	}

	/**
	 * 解析音轨顺序
	 * 
	 * @param {string} name 名称，音频文件名
	 * @return {string}
	 */
	parseTrackOrder(name) {
		// 正则表达式匹配
		let regular = this.options.trackOrder || '';
		if (regular) {
			let patt = new RegExp(regular, 'i');
			let matchs = patt.exec(name);
			if (matchs) {
				// 优先子匹配文本，否则为匹配文本
				return matchs[1] || matchs[0];
			}
		}
		return name;
	}

	/**
	 * 解析音轨名称
	 * 
	 * @param {string} name 名称，音频文件名
	 * @return {string}
	 */
	parseTrackName(name) {
		// 正则表达式匹配
		let regular = this.options.trackName || '';
		if (regular) {
			let patt = new RegExp(regular, 'i');
			let matchs = patt.exec(name);
			if (matchs) {
				// 优先子匹配文本，否则为匹配文本
				return matchs[1] || matchs[0];
			}
		}
		return name;
	}

	/**
	 * 保存播放索引
	 * 
	 * @param {number} index 索引，从0开始
	 */
	savePlayerIndex(index) {
		index = parseInt(index)
		if (index >= 0) {
			this.saveRecord({index: index});
		}
	}

	/**
	 * 查询播放索引
	 * 
	 * @param {function} callback 回调，仅存在时回调
	 * @return {number|null} 成功返回索引，否则返回空
	 */
	queryPlayerIndex(callback = null) {
		// 取播放索引
		let record = this.queryRecord();
		// 索引从0开始
		let index = record.index === undefined ? null : record.index;
		if (index !== null && typeof callback === 'function') {
			callback(index);
		}
		return index;
	}

	/**
	 * 保存播放时间
	 * 
	 * @param {number} time 时间，单位秒，从0开始
	 */
	savePlayerTime(time) {
		time = parseInt(time)
		if (time >= 0) {
			this.saveRecord({time: time});
		}
	}

	/**
	 * 查询播放时间 
	 * 
	 * @param {function} callback 回调，仅存在时回调
	 * @return {number|null} 成功返回时间，否则返回空
	 */
	queryPlayerTime(callback = null) {
		// 取播放时间 
		let record = this.queryRecord();
		let time = record.time || null;
		if (time !== null && typeof callback === 'function') {
			callback(time);
		}
		return time;
	}

	/**
	 * 保存记录
	 * 
	 * @param {object} data 数据
	 */
	saveRecord(data) {
		// 取记录列表
		let text = localStorage.getItem(LABEL + '-records');
		let records = text ? JSON.parse(text) : {};

		// 并入专辑记录
		let key = this.getAlistUrl() + this.getAlbumPath();
		if (key in records) {
			records[key] = Object.assign({}, records[key], data);
		} else {
			records[key] = data;
		}

		// 存储记录列表
		localStorage.setItem(LABEL + '-records', JSON.stringify(records));
	}

	/**
	 * 查询记录
	 * 
	 * @return {object}
	 */
	queryRecord() {
		// 取存储文本
		let text = localStorage.getItem(LABEL + '-records');
		if (!text) {
			return {};
		}

		// 转为记录列表
		let records = JSON.parse(text);
		if (typeof records !== 'object') {
			return {};
		}

		// 取专辑记录
		let key = this.getAlistUrl() + this.getAlbumPath();
		return records[key] || {};
	}

	/**
	 * 调试，会收调试选项(属性)影响
	 */
	debug() {
		if (parseInt(this.options.debug || 0)) {
			console.log(
				`%c ${LABEL} %c`,
				'color: #fff; background: #5f5f5f',
				'',
				...arguments
			);
		}
	}

	/**
	 * 错误
	 */
	error() {
		console.error(
			`%c ${LABEL} %c`,
			'color: #fff; background: #5f5f5f',
			'',
			...arguments
		);
	}

	/**
	 * 派生
	 */
	static derive()
	{
		Helper.deriveElement(LABEL, PREFIX);
	}
}