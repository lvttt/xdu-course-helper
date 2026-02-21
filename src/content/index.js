// src/content/index.js
(function(){

    console.log('选课助手 Content Script 已加载');
    const tabInsertList = [
        {
            text: '已收藏课程',
            roleVal: 999,
        }
    ]

    const zeroGridInsertCollectionList = [
        "#zynkcGrid",           // 计划内课程
        "#allCourseGrid",       // 开课课程查询
        "#blcAllCourseGrid",    // 本轮次开课课程查询
    ]

    /**
     * 通用的轮询/重试函数
     * @param {Function} fn - 需要执行的函数，返回 truthy 值表示成功
     * @param {number} maxAttempts - 最大尝试次数
     * @param {number} interval - 每次尝试的间隔 (ms)
     * @returns {Promise} - 成功时 resolve 返回值，失败时 reject
     */
    const poll = (fn, maxAttempts = 10, interval = 200) => {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            const execute = () => {
                const result = fn();
                if (result) {
                    return resolve(result); // 成功，返回执行结果
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    return reject(new Error('Reached maximum attempts without success.'));
                }

                setTimeout(execute, interval);
            };

            execute();
        });
    };

    /**************************************
     * 插入已收藏课程标签页
     **************************************/
    const findUlElement = () => {
        const tabContainer = document.getElementById('xkTabContainer');
        return tabContainer ? tabContainer.querySelector('ul') : null;
    };
    const createCustomTab = (liEl) => {
        if (!liEl) return null;

        const myLiList = [];  
        for (const tabInfo of tabInsertList) {
            const myliEl = liEl.cloneNode(true);
            const aEl = myliEl.querySelector('a');
            Object.assign(aEl, {
                id: `xkkctab_${tabInfo.roleVal}`,
                style: '',
                textContent: tabInfo.text
            });
            aEl.setAttribute('role-val', tabInfo.roleVal);
            aEl.setAttribute('role-title', tabInfo.text);
            aEl.setAttribute('show', 'true');
            myLiList.push(myliEl);
        }
        
        return myLiList;
    };
    const insertCustomTab = async () => {
        try {
            const ulEl = await poll(findUlElement);
            
            const lastLi = ulEl.lastElementChild;
            const tabList = createCustomTab(lastLi);
            
            if (tabList && tabList.length > 0) {
                for (const tab of tabList) {
                    ulEl.appendChild(tab);
                }
                console.log('选课助手: 成功插入标签');
            }
        } catch (error) {
            console.warn('选课助手: 无法找到标签栏容器，停止尝试', error);
        }
    };

    /**************************************
     * 插入收藏按钮
     **************************************/
    const handleCollectionButtonClick = (bjdm, isCollected) => {
        if (isCollected) {
            removeCourseFromCollection(bjdm);
        } else {
            const course = window.xdu_course_helper.zeroGridDatas.datas.find(item => item.BJDM === bjdm);
            addCourseToCollection(course);
        }
        window.xdu_course_helper.zeroGridRenderDataFunc(window.xdu_course_helper.zeroGridDatas);
    }
    const insertCollectionButton = (zeroGridInstance) => {
        if (zeroGridInsertCollectionList.includes(zeroGridInstance.params.container)) {
            if (zeroGridInstance.params.columns.some(col => col.display === '收藏')) {
                return;
            }
            zeroGridInstance.params.columns.push({
                display: '收藏',
                width: '7%',
                align: 'center',
                view: function(row) {
                    const isCollected = window.xdu_course_helper.collectionData.some(item => item.BJDM === row.BJDM);
                    return '<a class="zeromodal-btn zeromodal-btn-primary xkbtn" collection-button \
                    collection-status='+isCollected+' data-bjdm='+row.BJDM+'  href="javascript:void(0);" ">\
                    '+ (isCollected ? '取消收藏' : '收藏') +'</a>';
                }
            })
        }
    }
    const bindCollectionButtonEvent = () => {
        $.find('a[collection-button]').forEach(el => {
            el.addEventListener('click', (e) => {
                const bjdm = e.currentTarget.getAttribute('data-bjdm');
                const isCollected = e.currentTarget.getAttribute('collection-status') === 'true';
                handleCollectionButtonClick(bjdm, isCollected);
            })
        });
    }
    const hookZeroGridLoad = async () => {
        poll(() => {
            return window.zeroGrid != null
        }).then(() => {
            const originalRender = window.zeroGrid.prototype.render;
            const originalRenderData = window.zeroGrid.prototype.renderData;
            window.zeroGrid.prototype.render = function(...args) {
                // 这里可以在渲染前后进行操作，例如修改参数、插入按钮等
                console.log(this);
                insertCollectionButton(this);
                originalRender.apply(this, args);   
            }
            window.zeroGrid.prototype.renderData = function(...args) {
                // 这里可以在数据渲染前后进行操作，例如绑定事件等
                originalRenderData.apply(this, args);
                bindCollectionButtonEvent();
                window.xdu_course_helper.zeroGridDatas = args[0];
                window.xdu_course_helper.zeroGridRenderDataFunc = this.renderData.bind(this);
            }
            window.zynkc_zeroGrid.render();
            console.log('选课助手: 成功找到 zeroGrid 对象并完成函数钩子');
        }).catch((error) => {
            console.warn('选课助手: 无法找到 zeroGrid 对象，无法进行函数钩子', error);
        });
    }

    /**************************************
     * 已收藏课程crud逻辑
     **************************************/
    const getCollectionData = () => {
        const data = localStorage.getItem('course_collection');
        return data ? JSON.parse(data) : [];
    }

    const saveCollectionData = (collection) => {
        localStorage.setItem('course_collection', JSON.stringify(collection));
    }

    const loadCollectionData = () => {
        window.xdu_course_helper.collectionData = getCollectionData();
        console.log('选课助手: 已加载收藏课程数据', window.xdu_course_helper.collectionData);
    }

    const addCourseToCollection = (course) => {
        const index = window.xdu_course_helper.collectionData.findIndex(item => item.BJDM === course.BJDM);
        if (index !== -1) {
            window.xdu_course_helper.collectionData[index] = course;
        } else {
            window.xdu_course_helper.collectionData.push(course);
        }
        saveCollectionData(window.xdu_course_helper.collectionData);
    }

    const removeCourseFromCollection = (bjdm) => {
        window.xdu_course_helper.collectionData = window.xdu_course_helper.collectionData.filter(item => item.BJDM !== bjdm);
        saveCollectionData(window.xdu_course_helper.collectionData);
    }

    insertCustomTab();
    loadCollectionData();
    hookZeroGridLoad();

})();