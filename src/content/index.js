// src/content/index.js
(function () {
    console.log('选课助手 Content Script 已加载');
    const tabInsertList = [
        {
            text: '已收藏课程',
            roleVal: 999,
            zeroGridContainerId: '#collectionGrid',
            formContainerId: 'ysckcGrid',
            init: function () {
                collectionPageInit(this);
            },
        },
    ];

    const zeroGridInsertCollectionList = [
        '#zynkcGrid', // 计划内课程
        '#allCourseGrid', // 开课课程查询
        '#blcAllCourseGrid', // 本轮次开课课程查询
        '#ysckcGrid', // 已收藏课程
    ];

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
                textContent: tabInfo.text,
            });
            aEl.setAttribute('role-val', tabInfo.roleVal);
            aEl.setAttribute('role-title', tabInfo.text);
            aEl.setAttribute('show', 'true');
            aEl.addEventListener('click', function () {
                ($('[cv-role="tab"]').parent().removeClass('cv-active'),
                    $(this).parent().addClass('cv-active'));
                tabInfo.init();
            });
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
     * 添加已收藏课程页面
     **************************************/
    const collectionPageInit = (tabInfo) => {
        $('[role="kcfltab"]').toggleClass('cv-block-hide', !0);
        $('#xk_containrt_' + tabInfo.roleVal).removeClass('cv-block-hide');
        $(tabInfo.zeroGridContainerId).html(`<div id="${tabInfo.formContainerId}"></div>`);
        const selectAllBtn = $('<button>')
            .addClass('cv-btn cv-btn-primary')
            .css({ width: '80px', height: '35px', marginRight: '10px' })
            .text('全选')
            .on('click', () => {
                changeAllCheckboxInCollection(true);
            });
        const deselectAllBtn = $('<button>')
            .addClass('cv-btn cv-btn-default')
            .css({ width: '80px', height: '35px', marginRight: '10px' })
            .text('全不选')
            .on('click', () => {
                changeAllCheckboxInCollection(false);
            });
        const batchSelectBtn = $('<button>')
            .addClass('cv-btn cv-btn-success')
            .css({ width: '80px', height: '35px' })
            .text('批量选课')
            .on('click', () => {
                const selectedCourses = getSelectedCoursesInCollection();
                batchSelectCourses(selectedCourses);
            });
        const buttonContainer = $('<div>').css({ marginBottom: '15px' });
        buttonContainer.append(selectAllBtn).append(deselectAllBtn).append(batchSelectBtn);
        $(tabInfo.zeroGridContainerId).prepend(buttonContainer);

        window.courseTableFieldDefine.ysckcColumns =
            window.courseTableFieldDefine.yxkcColumns.filter(
                (col) => col.display !== '操作' && col.display !== '课程类别'
            );
        window.courseTableFieldDefine.ysckcColumns.find((col) => col.display === '学分').property =
            'KCXF';
        window.courseTableFieldDefine.ysckcColumns.unshift({
            display: '',
            width: '5%',
            align: 'center',
            view: function (row) {
                return '<input type="checkbox" xk-checkbox data-bjdm="' + row.BJDM + '" />';
            },
        });

        window.xdu_course_helper.selectedCoursesInCollection = [];

        new zeroGrid({
            container: '#' + tabInfo.formContainerId,
            dataKey: 'KCDM',
            columns: window.courseTableFieldDefine.ysckcColumns,
            datas: window.xdu_course_helper.collectionData,
            pageSize: window.WIS_XTCS.xkgl_xsxkmymrxsjls,
            loadAfterListener: function () {
                $.find('input[xk-checkbox]').forEach((el) => {
                    const bjdm = el.getAttribute('data-bjdm');
                    if (window.xdu_course_helper.selectedCoursesInCollection.includes(bjdm)) {
                        el.checked = true;
                    }
                    el.addEventListener('change', (e) => {
                        const bjdm = e.currentTarget.getAttribute('data-bjdm');
                        if (e.currentTarget.checked) {
                            if (
                                !window.xdu_course_helper.collectionData.some(
                                    (item) => item.BJDM === bjdm
                                )
                            ) {
                                e.currentTarget.checked = false;
                                return;
                            }
                            if (
                                !window.xdu_course_helper.selectedCoursesInCollection.includes(bjdm)
                            ) {
                                window.xdu_course_helper.selectedCoursesInCollection.push(bjdm);
                            }
                        } else {
                            window.xdu_course_helper.selectedCoursesInCollection =
                                window.xdu_course_helper.selectedCoursesInCollection.filter(
                                    (item) => item !== bjdm
                                );
                        }
                    });
                });
            },
        }).render();

        console.log(`选课助手: ${tabInfo.text}页面初始化完成`);
    };
    const createAllPageArticle = () => {
        const originalArticle = $('<article>').addClass('cv-block-hide cv-pb-38').attr({
            role: 'kcfltab',
        });
        tabInsertList.forEach((tabInfo) => {
            const newArticle = $(originalArticle.clone(true));
            newArticle.attr('id', 'xk_containrt_' + tabInfo.roleVal);
            newArticle.append($('<div>').addClass('course_title'));
            newArticle.append(
                $('<div>')
                    .addClass('cv-expert-mode')
                    .attr({
                        id: tabInfo.zeroGridContainerId.replace('#', ''),
                        style: 'min-height: 550px;',
                    })
            );
            $('#cvAside').before(newArticle);
        });
    };

    /**************************************
     * 插入收藏按钮
     **************************************/
    const handleCollectionButtonClick = (bjdm, isCollected) => {
        if (isCollected) {
            removeCourseFromCollection(bjdm);
            if (window.xdu_course_helper.selectedCoursesInCollection.includes(bjdm)) {
                window.xdu_course_helper.selectedCoursesInCollection =
                    window.xdu_course_helper.selectedCoursesInCollection.filter(
                        (item) => item !== bjdm
                    );
            }
        } else {
            const course = window.xdu_course_helper.zeroGridDatas.datas.find(
                (item) => item.BJDM === bjdm
            );
            addCourseToCollection(course);
        }
        window.xdu_course_helper.zeroGridRenderDataFunc(window.xdu_course_helper.zeroGridDatas);
    };
    const insertCollectionButton = (zeroGridInstance) => {
        if (zeroGridInsertCollectionList.includes(zeroGridInstance.params.container)) {
            if (zeroGridInstance.params.columns.some((col) => col.display === '收藏')) {
                return;
            }
            zeroGridInstance.params.columns.push({
                display: '收藏',
                width: '7%',
                align: 'center',
                view: function (row) {
                    const isCollected = window.xdu_course_helper.collectionData.some(
                        (item) => item.BJDM === row.BJDM
                    );
                    return (
                        '<a class="zeromodal-btn zeromodal-btn-primary xkbtn" collection-button \
                    collection-status=' +
                        isCollected +
                        ' data-bjdm=' +
                        row.BJDM +
                        '  href="javascript:void(0);" ">\
                    ' +
                        (isCollected ? '取消收藏' : '收藏') +
                        '</a>'
                    );
                },
            });
        }
    };
    const bindCollectionButtonEvent = () => {
        $.find('a[collection-button]').forEach((el) => {
            el.addEventListener('click', (e) => {
                const bjdm = e.currentTarget.getAttribute('data-bjdm');
                const isCollected = e.currentTarget.getAttribute('collection-status') === 'true';
                handleCollectionButtonClick(bjdm, isCollected);
            });
        });
    };
    const hookZeroGrid = async () => {
        poll(() => {
            return window.zeroGrid != null;
        }, 20)
            .then(() => {
                const originalRender = window.zeroGrid.prototype.render;
                const originalRenderData = window.zeroGrid.prototype.renderData;
                window.zeroGrid.prototype.render = function (...args) {
                    // 这里可以在渲染前后进行操作，例如修改参数、插入按钮等
                    insertCollectionButton(this);
                    originalRender.apply(this, args);
                };
                window.zeroGrid.prototype.renderData = function (...args) {
                    // 这里可以在数据渲染前后进行操作，例如绑定事件等
                    originalRenderData.apply(this, args);
                    bindCollectionButtonEvent();
                    window.xdu_course_helper.zeroGridDatas = args[0];
                    window.xdu_course_helper.zeroGridRenderDataFunc = this.renderData.bind(this);
                };
                window.zynkc_zeroGrid.render();
                console.log('选课助手: 成功找到 zeroGrid 对象并完成函数钩子');
            })
            .catch((error) => {
                console.warn('选课助手: 无法找到 zeroGrid 对象，无法进行函数钩子', error);
            });
    };

    /**************************************
     * 已收藏课程crud逻辑
     **************************************/
    const getCollectionData = () => {
        const data = localStorage.getItem('course_collection');
        return data ? JSON.parse(data) : [];
    };

    const saveCollectionData = (collection) => {
        localStorage.setItem('course_collection', JSON.stringify(collection));
    };

    const loadCollectionData = () => {
        window.xdu_course_helper.collectionData = getCollectionData();
        // console.log('选课助手: 已加载收藏课程数据', window.xdu_course_helper.collectionData);
    };

    const addCourseToCollection = (course) => {
        const index = window.xdu_course_helper.collectionData.findIndex(
            (item) => item.BJDM === course.BJDM
        );
        if (index !== -1) {
            window.xdu_course_helper.collectionData[index] = course;
        } else {
            window.xdu_course_helper.collectionData.push(course);
        }
        saveCollectionData(window.xdu_course_helper.collectionData);
    };

    const removeCourseFromCollection = (bjdm) => {
        window.xdu_course_helper.collectionData = window.xdu_course_helper.collectionData.filter(
            (item) => item.BJDM !== bjdm
        );
        saveCollectionData(window.xdu_course_helper.collectionData);
    };

    /**************************************
     * 批量选课逻辑
     **************************************/
    const changeAllCheckboxInCollection = (status) => {
        window.xdu_course_helper.selectedCoursesInCollection = [];
        $.find('input[xk-checkbox]').forEach((el) => {
            el.checked = status;
            const bjdm = el.getAttribute('data-bjdm');
            if (status) {
                window.xdu_course_helper.selectedCoursesInCollection.push(bjdm);
            } else {
                window.xdu_course_helper.selectedCoursesInCollection =
                    window.xdu_course_helper.selectedCoursesInCollection.filter(
                        (item) => item !== bjdm
                    );
            }
        });
    };

    const getSelectedCoursesInCollection = () => {
        const selectedCourses = [];
        $.find('input[xk-checkbox]:checked').forEach((el) => {
            const bjdm = el.getAttribute('data-bjdm');
            const course = window.xdu_course_helper.collectionData.find(
                (item) => item.BJDM === bjdm
            );
            if (course) {
                selectedCourses.push(course);
            }
        });
        return selectedCourses;
    };

    const batchSelectCourses = async (courses) => {
        if (courses.length === 0) {
            return;
        }
        const successCourses = [];
        const failureCourses = [];
        const csrfToken = await getCsrfToken();

        console.log('选课助手: 批量提交选课队列开始');

        const requestPromises = courses.map((course) =>
            submitCourse({ bjdm: course.BJDM, csrfToken })
        );
        const results = await Promise.allSettled(requestPromises);
        results.forEach((result, index) => {
            const course = courses[index];
            if (result.status === 'fulfilled') {
                const res = result.value;
                if (res && res.code === 1) {
                    successCourses.push(course.KCMC);
                } else {
                    failureCourses.push({
                        courseName: course.KCMC,
                        message: res?.msg || '选课请求失败',
                    });
                }
            } else {
                failureCourses.push({
                    courseName: course.KCMC,
                    message: '选课请求失败',
                });
            }
        });

        console.log('选课助手: 批量提交选课队列完成');
        showBatchSelectResult(successCourses, failureCourses);
    };

    const showBatchSelectResult = (successCourses, failureCourses) => {
        const modalId = 'xdu-helper-result-modal';
        $(`#${modalId}`).remove();

        const total = successCourses.length + failureCourses.length;

        const modalHtml = `
        <div id="${modalId}" style="z-index: 999999; position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); font-family: system-ui, -apple-system, sans-serif;">
            <div style="background: white; width: 520px; max-width: 95%; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; animation: xduSlideUp 0.3s ease-out;">
                <div style="padding: 20px 24px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">批量选课结果报告</h3>
                    <span style="font-size: 13px; background: #f3f4f6; color: #6b7280; padding: 4px 10px; border-radius: 20px;">共处理 ${total} 门</span>
                </div>

                <div style="padding: 24px; max-height: 450px; overflow-y: auto;">
                    
                    ${
                        successCourses.length > 0
                            ? `
                        <div style="margin-bottom: 24px;">
                            <div style="display: flex; align-items: center; gap: 8px; color: #059669; font-size: 15px; font-weight: 700; margin-bottom: 12px;">
                                <span>🚀 已成功提交队列 (${successCourses.length})</span>
                            </div>
                            <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                                <p style="margin: 0; font-size: 12px; color: #065f46; line-height: 1.5;">
                                    💡 提示：队列提交成功不代表最终选上，请务必前往<b>“已选课程”</b>页面确认最终结果。
                                </p>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                ${successCourses
                                    .map(
                                        (name) => `
                                    <div style="width: calc(50% - 6px); background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; border-radius: 8px; box-sizing: border-box;">
                                        <div style="font-size: 13px; color: #374151; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${name}">${name}</div>
                                    </div>
                                `
                                    )
                                    .join('')}
                            </div>
                        </div>
                    `
                            : ''
                    }

                    ${
                        failureCourses.length > 0
                            ? `
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; color: #dc2626; font-size: 15px; font-weight: 700; margin-bottom: 12px;">
                                <span>❌ 提交失败 (${failureCourses.length})</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                ${failureCourses
                                    .map(
                                        (f) => `
                                    <div style="width: calc(50% - 6px); background: #fef2f2; border: 1px solid #fee2e2; padding: 10px; border-radius: 8px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div style="font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${f.courseName}</div>
                                        <div style="font-size: 11px; color: #b91c1c; opacity: 0.8;">原因: ${f.message}</div>
                                    </div>
                                `
                                    )
                                    .join('')}
                            </div>
                        </div>
                    `
                            : ''
                    }
                </div>

                <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #f0f0f0; text-align: right;">
                    <button id="xdu-close-modal" style="padding: 10px 28px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                        我知道了
                    </button>
                </div>
            </div>
        </div>

        <style>
            @keyframes xduSlideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            #xdu-close-modal:hover { background: #1d4ed8 !important; transform: translateY(-1px); box-shadow: 0 6px 12px -2px rgba(37, 99, 235, 0.3); }
            #xdu-close-modal:active { transform: translateY(0); }
        </style>
        `;

        $('body').append(modalHtml);

        $('#xdu-close-modal').on('click', function () {
            $(`#${modalId}`).fadeOut(200, function () {
                $(this).remove();
            });
        });
    };

    const getCsrfToken = async () => {
        const csrfToken = $('#csrfToken').val();
        if (csrfToken) {
            return csrfToken;
        } else {
            const response = await fetch(
                'https://yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/xsxkHome/loadPublicInfo_course.do'
            );
            try {
                const data = await response.json();
                return data.csrfToken;
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error);
                return null;
            }
        }
    };

    const submitCourse = async (data) => {
        return fetch(
            'https://yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/xsxkCourse/choiceCourse.do',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(data).toString(),
            }
        ).then((response) => response.json());
    };

    insertCustomTab();
    loadCollectionData();
    hookZeroGrid();

    poll(() => {
        if (window.$) return true;
    }).then(() => {
        // 需要使用$的操作放在这里
        createAllPageArticle();
    });
})();
