import React from "react";
import { gantt, Gantt } from "dhtmlx-gantt";
import { Button } from "yonui-ys";
import { FormControl, Select, Message, Loading } from "tinper-bee";
import GanttPage from "./gantt";
import Util from "./util";
const pako = require("pako");
const common = require("../../../../../business/common/common_VM.Extend");

const Option = Select.Option;
// 甘特图工具栏样式
process.env.__CLIENT__ &&
  require("dhtmlx-gantt/codebase/ext/css/controls_styles.css?v=7.0.1");
process.env.__CLIENT__ &&
  require("dhtmlx-gantt/codebase/ext/css/dhx_file_dnd.css?v=7.0.1");
// 甘特图基础样式
process.env.__CLIENT__ &&
  require("dhtmlx-gantt/codebase/cdn/css/dhtmlx.css?v=7.0.1");
// 甘特图基础样式
process.env.__CLIENT__ &&
  require("dhtmlx-gantt/codebase/dhtmlxgantt.css?v=7.0.1");
// 甘特图多选样式
process.env.__CLIENT__ &&
  require("dhtmlx-gantt/codebase/ext/js/multiselect.js?v=7.0.1");
// 甘特图本地动态样式
process.env.__CLIENT__ && require("./GanttView.less");

// 重连标志
let lockReconnect = false;
// 重连次数
let reconectNum = 0;
let cachedSettings = {};

// 保存错误重连次数
let progressNumber = 1;

class GanttView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ganttNeedData: {},
      criticalPathS: false,
      toggleModeStatus: true,
      linksStatus: false,
      oAndCtaskS: true,
      selectValue: "",
      token: "",
      isEdit: true,
      showDefault: false,
      saveData: [],
      saveLink: [],
      autoScheduleChangeData: [],
      paramsAndTime: false,
      onSearchIndex: 0,
      noChangeValue: null,
      searchOpenTask: false,
      relinkData: [],
      val: 0,
      lockedTaskData: [],
      decompositionId: null,
      projectId: null,
      parentTaskIds: null,
      formGanttStatus: false,
      hasLoadingAll: false,
      dirtyData: [],
      modalOnok: false,
      // 心跳时间
      heartbeatInterval: 9000,
      searchValue: null,
      durationUnit: "day",
      addAndDetelLinkId: null,
      beforeChangeData: [],
      positionLeft: 0,
      taskCanStartup: false,
      // 执行中分解不能超过的ID
      progressOutId: null,
    };
    this.store = Util.getRandomString();
  }
  async componentDidMount() {
    const _this = this;
    window[`gantt${this.store}`] = Gantt.getGanttInstance();
    const { pageModel } = this.props;
    pageModel.on("loadGanttData", async function (data) {
      if (Util.isEmptyObj(_this.state.ganttNeedData)) {
        let prjTaskParams = data.taskId
          ? { projectId: data.projectId, taskIds: data.taskId, fromBag: 1 }
          : { projectId: data.projectId };
        const result = await Util.getApi("GET", "/prjTask/delayQueryByTaskId", {
          ...prjTaskParams,
        });
        const { token, ...more } = result;
        _this.needObjArr = Util.getDateOrLink(more.data[0]);
        more.data = more.data.map((item) => {
          const newI = { ...item };
          if (item.taskType === "MIESTONE") {
            newI.type = "milestone";
          } else {
            newI.type = "task";
          }
          newI.progress = item.progress / 100;
          return newI;
        });
        _this.setState(
          {
            token,
            ganttNeedData: { ...more },
            projectId: data.projectId,
            parentTaskIds: data.taskId,
            formGanttStatus:
              pageModel.originalParams &&
              pageModel.originalParams.query &&
              pageModel.originalParams.query.detailModel &&
              pageModel.originalParams.query.detailModel == "wfmodel"
                ? true
                : false,
          },
          () => {
            let script = document.createElement("script");
            script.type = "text/javascript";
            script.async = true;
            script.src = "https://export.dhtmlx.com/beta/gantt/api.js?v=7.0.1";
            document.head.appendChild(script);
          }
        );
      }
    });
  }
  componentWillUnmount() {
    window[`gantt${this.store}`].destructor();
    delete window[`gantt${this.store}`];
    this.lockedTaskDataTimer && clearInterval(this.lockedTaskDataTimer);
    this.lockedTaskDataTimer = null;
    this.heartCheck && this.heartCheck.reset();
    if (
      window[`${this.store}_ws`] &&
      window[`${this.store}_ws`].readyState == 1
    ) {
      window[`${this.store}_ganttWebSocket`] = true;
      window[`${this.store}_ws`].close();
    } else {
      delete window[`${this.store}_ganttWebSocket`];
      delete window[`${this.store}_ws`];
    }
  }
  initGantt = () => {
    const _this = this;
    window[`gantt${this.store}`].attachEvent("onGanttRender", function () {
      window[`gantt${_this.store}`].eachTask(function (task) {
        if (task.parent === 0) {
          _this.projectTimeObj = task;
        }
      });
    });

    // 自动排程
    window[`gantt${this.store}`].attachEvent(
      "onAfterAutoSchedule",
      async function (taskId, updatedTasks) {
        const {
          paramsAndTime,
          modalOnok,
          addAndDetelLinkId,
          beforeChangeData,
          saveLink,
        } = _this.state;
        if (taskId || addAndDetelLinkId) {
          _this.AutoScheduleTime && clearTimeout(_this.AutoScheduleTime);
          _this.AutoScheduleTime = null;
          _this.setState({
            showDefault: true,
          });
          // let allId = taskId
          //   ? [...new Set([...updatedTasks, Number(taskId)])]
          //   : [...updatedTasks];
          let allId = [];
          let result = [];
          let taskIdmessageArr = [];
          let hasLockedTask = false;
          let outTimeStatus = false;
          let swParentArr = [];
          window[`gantt${_this.store}`].eachParent(function (task) {
            if (
              task.classifyCode === "PROGRESS" ||
              task.classifyCode === "WAITING"
            ) {
              swParentArr.push(task.id);
            }
          }, id);
          const current_state = _this.getTaskParentData(null, false);
          for (let i = 0; i < beforeChangeData.length; i++) {
            const s = current_state.find(
              (item) => item.id == beforeChangeData[i].id
            );
            if (
              +_this.parseDate(s.start_date) !=
                +_this.parseDate(beforeChangeData[i].start_date) ||
              +_this.parseDate(s.end_date) !=
                +_this.parseDate(beforeChangeData[i].end_date)
            ) {
              allId.push(beforeChangeData[i].id);
            }
          }
          for (let i = 0; i < allId.length; i++) {
            const task = _this.getTaskMessage(allId[i]);
            if (task.timeLocked) {
              hasLockedTask = true;
              break;
            }
            if (swParentArr.length > 0) {
              const swTask = _this.getTaskMessage(swParentArr[0]);
              if (
                +_this.parseDate(swTask.end_date, "%d-%m-%Y") <
                  +task.end_date &&
                _this.state.parentTaskIds
              ) {
                outTimeStatus = true;
                break;
              }
            } else if (
              +_this.parseDate(_this.projectTimeObj.end_date, "%d-%m-%Y") <
                +task.end_date &&
              _this.state.parentTaskIds
            ) {
              outTimeStatus = true;
              break;
            }
            let $sendObject = {
              taskKey: task.taskKey,
              timeVersion: task.timeVersion,
              text: task.text,
              id: task.id,
              code: task.code,
            };
            if (paramsAndTime) {
              $sendObject = Object.assign($sendObject, {
                paramVersion: task.paramVersion,
              });
            }
            taskIdmessageArr.push($sendObject);
            let res = _this.getNeedData({ ...task });
            result.push(res);
          }
          if (hasLockedTask || outTimeStatus) {
            _this.AutoScheduleTime = setTimeout(() => {
              window[`gantt${_this.store}`].undo();
              if (addAndDetelLinkId && updatedTasks.length > 1) {
                const addAndDetelLinkIdArray = addAndDetelLinkId.split("-");
                if (addAndDetelLinkIdArray[1] === "add") {
                  window[`gantt${_this.store}`].deleteLink(
                    addAndDetelLinkIdArray[0]
                  );
                } else {
                  saveLink.map((item) => {
                    if (item.id == addAndDetelLinkIdArray[0]) {
                      window[`gantt${_this.store}`].addLink(item);
                    }
                  });
                }
              }
              if (addAndDetelLinkId) {
                _this.setState({
                  addAndDetelLinkId: null,
                });
              }
              _this.promptInformation(
                hasLockedTask
                  ? "相关任务正在被他人编辑"
                  : "后置任务超出最后时间"
              );
              _this.setState({
                showDefault: false,
              });
            }, 200);
          } else {
            try {
              await _this.sendLockAEdit(taskIdmessageArr, result);
              // showDefault会自动设为false
              _this.setState({
                showDefault: true,
              });
              // 延迟时间设置
              // window[`gantt${_this.store}`].config.auto_scheduling = false;
              // for (let j = 0; j < allId.length; j++) {
              //   const task = window[`gantt${_this.store}`].getTask(allId[j]);
              //   const target_links = task.$target;
              //   console.log(target_links);
              //   for (let i = 0; i < target_links.length; i++) {
              //     var link = window[`gantt${_this.store}`].getLink(
              //       target_links[i]
              //     );
              //     let predecessor_id = link.source;
              //     let predecessor = window[`gantt${_this.store}`].getTask(
              //       predecessor_id
              //     );
              //     let new_lag = window[`gantt${_this.store}`].calculateDuration(
              //       predecessor.end_date,
              //       task.start_date
              //     );
              //     link.lag = new_lag;
              //     window[`gantt${_this.store}`].updateLink(link.id);
              //   }
              // }
              // window[`gantt${_this.store}`].config.auto_scheduling = true;
              _this.getLastSave(allId, "UPDATE");
              _this.refreshSummaryProgress(
                window[`gantt${_this.store}`].getParent(taskId),
                true
              );
              if (addAndDetelLinkId) {
                _this.setState({
                  addAndDetelLinkId: null,
                });
              }
              _this.setState({
                showDefault: false,
              });
            } catch (e) {
              // 异步了 回退不生效 所以用了定时器
              _this.AutoScheduleTime = setTimeout(() => {
                window[`gantt${_this.store}`].undo();
                if (addAndDetelLinkId && updatedTasks.length > 1) {
                  const addAndDetelLinkIdArray = addAndDetelLinkId.split("-");
                  if (addAndDetelLinkIdArray[1] === "add") {
                    window[`gantt${_this.store}`].deleteLink(
                      addAndDetelLinkIdArray[0]
                    );
                  } else {
                    saveLink.map((item) => {
                      if (item.id == addAndDetelLinkIdArray[0]) {
                        window[`gantt${_this.store}`].addLink(item);
                      }
                    });
                  }
                }
                if (addAndDetelLinkId) {
                  _this.setState({
                    addAndDetelLinkId: null,
                  });
                }
                _this.setState({
                  showDefault: false,
                });
              }, 0);
            }
          }
        }
      }
    );
    // 拖拽限制时间
    window[`gantt${this.store}`].attachEvent(
      "onTaskDrag",
      function (id, mode, task) {
        let swParentArr = [];
        window[`gantt${_this.store}`].eachParent(function (task) {
          if (
            task.classifyCode === "PROGRESS" ||
            task.classifyCode === "WAITING"
          ) {
            swParentArr.push(task.id);
          }
        }, id);
        if (_this.state.parentTaskIds || swParentArr.length > 0) {
          const modes = gantt.config.drag_mode;
          let limitLeft = null,
            limitRight = null;

          if (!(mode == modes.move || mode == modes.resize)) return;

          if (mode == modes.move) {
            limitLeft = _this.limitMoveLeft;
            limitRight = _this.limitMoveRight;
          } else if (mode == modes.resize) {
            limitLeft = _this.limitResizeLeft;
            limitRight = _this.limitResizeRight;
          }
          if (sss.length > 0) {
            const swTask = _this.getTaskMessage(swParentArr[0]);
            if (
              +window[`gantt${_this.store}`].date.parseDate(
                swTask.end_date,
                "%d-%m-%Y"
              ) < +task.end_date
            ) {
              limitLeft(task, swTask);
            }
            if (
              +window[`gantt${_this.store}`].date.parseDate(
                swTask.start_date,
                "%d-%m-%Y"
              ) > +task.start_date
            ) {
              limitRight(task, swTask);
            }
          } else {
            if (
              +window[`gantt${_this.store}`].date.parseDate(
                _this.projectTimeObj.end_date,
                "%d-%m-%Y"
              ) < +task.end_date
            ) {
              limitLeft(task, _this.projectTimeObj);
            }
            if (
              +window[`gantt${_this.store}`].date.parseDate(
                _this.projectTimeObj.start_date,
                "%d-%m-%Y"
              ) > +task.start_date
            ) {
              limitRight(task, _this.projectTimeObj);
            }
          }
        }
        if (mode == "progress") {
          _this.refreshSummaryProgress(
            window[`gantt${_this.store}`].getParent(id),
            false
          );
        }
      }
    );
    // 新增线
    window[`gantt${this.store}`].attachEvent(
      "onAfterLinkAdd",
      async function (id, link) {
        const { saveLink, projectId } = _this.state;
        if (!saveLink.some((item) => item.id == id)) {
          _this.setState({
            showDefault: true,
          });
          // 控制线加锁还没有完成就自动排程
          window[`gantt${_this.store}`].config.auto_scheduling = false;
          window[`gantt${_this.store}`].render();
          let result = [];
          let taskIdmessageArr = [];
          let dLinkObj = { ...link };
          let sourceTaskCode, targetTaskCode;
          [link.source, link.target].map((item, index) => {
            const task = _this.getTaskMessage(item);
            taskIdmessageArr.push({
              taskKey: task.taskKey,
              timeVersion: task.timeVersion,
              text: task.text,
              id: task.id,
              code: task.code,
            });
            if (index === 0) {
              sourceTaskCode = task.code;
            } else {
              targetTaskCode = task.code;
            }
            result.push(_this.getNeedData({ ...task }));
          });
          dLinkObj.handleType = "ADD";
          dLinkObj.positionType = "BEFORE";
          dLinkObj.projectId = projectId;
          dLinkObj.sourceTaskCode = sourceTaskCode;
          dLinkObj.targetTaskCode = targetTaskCode;
          dLinkObj.type = Number(dLinkObj.type);
          _this.dAndAToAuto(taskIdmessageArr, result, dLinkObj, "add");
        } else {
          _this.deleteLinkDate(id);
        }
      }
    );
    // 删除线后
    window[`gantt${this.store}`].attachEvent(
      "onAfterLinkDelete",
      async function (id, link) {
        const { saveLink } = _this.state;
        if (!saveLink.some((item) => item.id == id)) {
          _this.setState({
            showDefault: true,
          });
          let result = [];
          let taskIdmessageArr = [];
          let sourceTaskCode, targetTaskCode;
          window[`gantt${_this.store}`].config.auto_scheduling = false;
          window[`gantt${_this.store}`].render();
          [link.source, link.target].map((item, index) => {
            const task = _this.getTaskMessage(item);
            taskIdmessageArr.push({
              taskKey: task.taskKey,
              timeVersion: task.timeVersion,
              text: task.text,
              id: task.id,
              code: task.code,
            });
            if (index === 0) {
              sourceTaskCode = task.code;
            } else {
              targetTaskCode = task.code;
            }
            result.push(_this.getNeedData({ ...task }));
          });
          let dLink = { ...link };
          dLink.handleType = "DELETE";
          dLink.type = Number(dLink.type);
          dLink.sourceTaskCode = sourceTaskCode;
          dLink.targetTaskCode = targetTaskCode;
          _this.dAndAToAuto(taskIdmessageArr, result, dLink, "delete");
        } else {
          _this.deleteLinkDate(id);
        }
      }
    );
    window[`gantt${this.store}`].attachEvent(
      "onAfterTaskUpdate",
      function (id) {
        _this.refreshSummaryProgress(
          window[`gantt${_this.store}`].getParent(id),
          true
        );
      }
    );
    // 打开属性弹窗
    window[`gantt${this.store}`].attachEvent(
      "onTaskDblClick",
      function (id, e) {
        const { pageModel } = _this.props;
        const { parentTaskIds } = _this.state;
        const data = pageModel.getAllData();
        const task = _this.getTaskMessage(id);
        const newTask = { ...task };
        newTask.start_date = _this.dateConversionString(task.start_date);
        newTask.end_date = _this.dateConversionString(task.end_date);
        _this.getTaskParentData(id);
        let disabledStartTime, disabledEndTime;
        if (parentTaskIds) {
          const rootTask = _this.getTaskMessage(parentTaskIds);
          disabledStartTime = _this.dateConversionString(rootTask.start_date);
          disabledEndTime = _this.dateConversionString(rootTask.end_date);
        }
        newTask.hasGantTaskChild =
          window[`gantt${_this.store}`].getChildren(id).length > 0
            ? true
            : false;
        cb.loader.runCommandLine(
          "bill",
          {
            billtype: "Voucher",
            billno: "rdpmPrjGanttModal",
            params: {
              query: {
                id,
              },
              menuId: false,
              metaType: "Voucher",
              mode: "edit",
              readOnly: _this.state.isEdit ? true : false,
              store: _this.store,
              newTask,
              allHasOver: true,
              modalOkAction: _this.modalOkAction,
              deleteTask: _this.deleteTask,
              projectId: _this.state.projectId,
              projectName: data.projectId_name || data.name,
              formType: "gantt-task",
              lifecycleUseId: task.lifecycleUseId,
              candOorgData: {
                createorg: data.createorg,
                createorg_name: data.createorg_name,
                ownedorg: data.ownedorg,
                ownedorg_name: data.ownedorg_name,
                disabledStartTime,
                disabledEndTime: `${disabledEndTime} 23:59:59`,
              },
            },
          },
          pageModel
        );
        return true;
      }
    );
    // 任务被拖拽
    window[`gantt${this.store}`].attachEvent(
      "onAfterTaskDrag",
      async function (id, mode) {
        if (mode == "progress") {
          const task = _this.getTaskMessage(id);
          _this.setState({
            showDefault: true,
          });
          const sendMessage = [
            {
              taskKey: task.taskKey,
              paramVersion: task.paramVersion,
              text: task.text,
              code: task.code,
              id: task.id,
            },
          ];
          const result = _this.getNeedData({ ...task });
          try {
            await _this.sendLockAEdit(sendMessage, [result]);
            _this.getLastSave(id, "UPDATE");
            _this.setState({
              showDefault: false,
            });
          } catch (e) {
            _this.setState({
              showDefault: false,
            });
            window[`gantt${_this.store}`].undo();
          }
        }
      }
    );
    // 数据初始化计算父级的进度
    window[`gantt${this.store}`].attachEvent("onParse", function () {
      window[`gantt${_this.store}`].eachTask(function (task) {
        task.progress = _this.calculateSummaryProgress(task);
      });
    });
    // 更改延迟时间
    window[`gantt${this.store}`].attachEvent("onLinkClick", function (id) {
      const { pageModel } = _this.props;
      if (_this.state.isEdit) return;
      _this.getTaskParentData(null);
      pageModel.communication({
        type: "modal",
        payload: {
          key: "TaskLink",
          data: {
            delete: (callback) => {
              let linkObj = window[`gantt${_this.store}`].getLink(id);
              const sourceTask = _this.getTaskMessage(linkObj.source);
              const targetTask = _this.getTaskMessage(linkObj.target);
              cb.utils.confirm({
                title: `关联${sourceTask.text}-${targetTask.text}将被删除`,
                onOk: () => {
                  if (sourceTask.timeLocked || targetTask.timeLocked) {
                    _this.promptInformation(
                      "其他用户-正在编辑相关数据，请稍后尝试。"
                    );
                  } else {
                    window[`gantt${_this.store}`].deleteLink(id);
                    callback();
                  }
                },
              });
            },
            ok: (number) => {
              if (number) {
                var link = window[`gantt${_this.store}`].getLink(id);
                link.lag = number;
                window[`gantt${_this.store}`].updateLink(link.id);
              }
            },
          },
        },
      });
    });
    // 左边table表头
    window[`gantt${this.store}`].config.columns = [
      {
        name: "overdue",
        label: "",
        width: 38,
        align: "center",
        template: function (obj) {
          if (obj.deadline) {
            const deadline = window[`gantt${_this.store}`].date.parseDate(
              obj.deadline,
              "xml_date"
            );
            if (deadline && obj.end_date > deadline) {
              return '<div class="overdue-indicator">!</div>';
            }
          }
          return null;
        },
      },
      {
        name: "wbs",
        label: "WBS",
        width: 50,
        align: "center",
        template: window[`gantt${_this.store}`].getWBSCode,
        resize: true,
      },
      {
        name: "code",
        label: "编码",
        width: 100,
        align: "center",
        resize: true,
      },
      {
        name: "text",
        label: "名称",
        width: 70,
        tree: true,
        resize: true,
      },
      {
        name: "type",
        label: "任务类型",
        align: "center",
        resize: true,
        width: 60,
        template: function (item) {
          let res;
          const length = window[`gantt${_this.store}`].getChildren(item.id)
            .length;
          if (item.taskType == "SPECIAL") {
            res = "关键任务";
          } else if (item.type === "milestone") {
            res = "里程碑";
          } else if (length > 0) {
            res = "项目";
          } else {
            res = "任务";
          }
          return res;
        },
      },
      {
        name: "description",
        label: "备注",
        width: 100,
        align: "center",
        resize: true,
      },
      {
        name: "grpMember_name",
        label: "任务负责人",
        width: 80,
        align: "center",
        resize: true,
      },
      {
        name: "start_date",
        label: "计划开始时间",
        align: "center",
        resize: true,
        width: 120,
      },
      {
        name: "end_date",
        label: "计划结束时间",
        align: "center",
        resize: true,
        width: 120,
      },
      {
        name: "duration",
        label: "计划工期",
        width: 50,
        align: "center",
        resize: true,
      },
      // {
      //   name: "start_date",
      //   label: "实际开始时间",
      //   align: "center",
      //   resize: true,
      //   width: 100,
      // },
      // {
      //   name: "end_date",
      //   label: "实际结束时间",
      //   align: "center",
      //   width: 100,
      //   resize: true,
      // },
      {
        name: "planWorkHour",
        label: "计划工时",
        align: "center",
        width: 100,
        resize: true,
      },
      {
        name: "realWorkHour",
        label: "实际工时",
        align: "center",
        width: 100,
        resize: true,
      },
      {
        name: "progress",
        label: "完成百分比",
        width: 80,
        align: "center",
        resize: true,
        template: function (item) {
          return Util.mul(Util.keepTwoDecimalFull(item.progress), 100);
        },
      },
      {
        name: "decomposition",
        width: 0,
        align: "center",
        template: function (task) {
          const { positionLeft, isEdit } = _this.state;
          // 下一个同级
          const nextSibling = window[`gantt${_this.store}`].getNextSibling(
            task.id
          );
          // 上一个同级
          const prevSibling = window[`gantt${_this.store}`].getPrevSibling(
            task.id
          );
          let buttonStatus = task.classifyCode
            ? ["PROGRESS", "WAITING", "EDITING"].some(
                (item) => item === task.classifyCode
              )
            : true;
          const module = `<div class="module-parent"><div class="button button-${
            task.$index
          }" style="left:${positionLeft}px;">${
            !isEdit
              ? `<div style="dispaly:flex"><p onclick="clickGridButton(${task.id})">分解</p><p onclick="addNewTask(${task.id})">新增</p></div>`
              : ""
          }</div></div>`;
          return buttonStatus ? module : null;
          // ${
          //   prevSibling ? `<p onClick="moveUp(${task.id})">上移</p>` : ""
          // }${
          //   nextSibling
          //     ? `<p onClick="moveDown(${task.id})">下移</p>`
          //     : ""
          // }
          // `<div style="dispaly:flex">${
          //   !task.publish
          //     ? `<p onClick="taskRelease(${task.id})">发布</p>`
          //     : ""
          // }${
          //   !task.publish
          //     ? `<p onClick="taskCompile(${task.id})">协同编制</p>`
          //     : ""
          // }</div>`
          // return `<div class="decomposition" onclick="clickGridButton(${task.id})">分解</div>`;
        },
      },
      {
        name: "creatorName",
        label: "创建者",
        resize: true,
        width: 80,
        align: "center",
      },
      // {
      //   name: "add",
      //   width: 40,
      //   resize: true,
      //   template: function () {
      //     return 123;
      //   },
      // },
    ];
    window[`gantt${this.store}`].attachEvent("onMouseMove", function (id, e) {
      if (id) {
        const { positionLeft } = _this.state;
        const Task = _this.getTaskMessage(id);
        const parentGrid = document.getElementsByClassName("gantt_grid")[0];
        const button = document.getElementsByClassName(
          `button-${Task.$index}`
        )[0];
        let left =
          parentGrid.scrollLeft +
          parentGrid.offsetWidth -
          (button ? button.offsetWidth : 0);
        if (positionLeft != left) {
          _this.setState(
            {
              positionLeft: left,
            },
            () => {
              window[`gantt${_this.store}`].render();
            }
          );
        }
      }
    });
    // 行-发布
    window.taskRelease = (id) => {
      const task = this.getTaskMessage(id);
      let needReleaseArr = [task];
      if (task.parent) {
        const parentTak = this.getTaskMessage(task.parent);
        if (!parentTak.publish) {
          cb.utils.alert("父任务没有发布，请在父任务上执行该操作", "warning");
          return;
        }
      }
      window[`gantt${this.store}`].eachTask(function (task) {
        needReleaseArr.push(task);
      }, id);
      this.release(needReleaseArr);
    };
    // 行-协同编制
    window.taskCompile = (id) => {
      this.synergyToCompile(id);
    };
    // 上移
    window.moveUp = (id) => {
      const task = this.getTaskMessage(id);
      window[`gantt${this.store}`].moveTask(
        id,
        window[`gantt${this.store}`].getTaskIndex(id) - 1,
        task.parent
      );
    };
    // 下移
    window.moveDown = (id) => {
      const task = this.getTaskMessage(id);
      window[`gantt${this.store}`].moveTask(
        id,
        window[`gantt${this.store}`].getTaskIndex(id) + 1,
        task.parent
      );
    };
    // 新增task
    window.addNewTask = (id) => {
      const { pageModel } = this.props;
      const { isEdit, parentTaskIds } = this.state;
      if (!isEdit) {
        const task = window[`gantt${this.store}`].getTask(id);
        if (task.timeLocked) {
          this.promptInformation(
            "其他用户-正在编辑相关数据，请稍后尝试。",
            "danger"
          );
          this.setState({
            showDefault: false,
          });
        } else {
          this.setState(
            {
              showDefault: true,
            },
            async () => {
              const sendMessage = [
                {
                  taskKey: task.taskKey,
                  paramVersion: task.paramVersion,
                  text: task.text,
                  code: task.code,
                  id: task.id,
                },
              ];
              const res = this.getNeedData(task);
              try {
                await this.sendLockAEdit(sendMessage, [res]);
                this.getLastSave(id, "UPDATE");
                window[`gantt${this.store}`].open(id);
                this.getTaskParentData(id);
                this.setState(
                  {
                    showDefault: false,
                    decompositionId: id,
                  },
                  () => {
                    const data = pageModel.getAllData();
                    let disabledStartTime, disabledEndTime;
                    if (parentTaskIds) {
                      const rootTask = _this.getTaskMessage(parentTaskIds);
                      disabledStartTime = _this.dateConversionString(
                        rootTask.start_date
                      );
                      disabledEndTime = _this.dateConversionString(
                        rootTask.end_date
                      );
                    }
                    cb.loader.runCommandLine(
                      "bill",
                      {
                        billtype: "Voucher",
                        billno: "rdpmPrjGanttModal",
                        params: {
                          query: {},
                          menuId: false,
                          metaType: "Voucher",
                          mode: "add",
                          // mode: "edit",
                          store: this.store,
                          taskId: Number(new Date().getTime()),
                          projectId: this.state.projectId,
                          projectName: data.projectId_name || data.name,
                          modalOkAction: this.modalOkAction,
                          formType: "gantt-task",
                          lifecycleUseId: task.lifecycleUseId,
                          candOorgData: {
                            createorg: data.createorg,
                            createorg_name: data.createorg_name,
                            ownedorg: data.ownedorg,
                            ownedorg_name: data.ownedorg_name,
                            disabledStartTime,
                            disabledEndTime: `${disabledEndTime} 23:59:59`,
                          },
                        },
                      },
                      pageModel
                    );
                  }
                );
              } catch (e) {
                this.setState({
                  showDefault: false,
                });
              }
            }
          );
        }
      }
    };
    window.clickGridButton = (id) => {
      const { pageModel } = this.props;
      const { isEdit, projectId } = this.state;
      if (!isEdit) {
        const task = window[`gantt${this.store}`].getTask(id);
        if (task.timeLocked) {
          this.promptInformation(
            "其他用户-正在编辑相关数据，请稍后尝试。",
            "danger"
          );
          this.setState({
            showDefault: false,
          });
        } else {
          this.setState(
            {
              showDefault: true,
            },
            async () => {
              const sendMessage = [
                {
                  taskKey: task.taskKey,
                  paramVersion: task.paramVersion,
                  text: task.text,
                  code: task.code,
                  id: task.id,
                },
              ];
              const res = this.getNeedData(task);
              try {
                await this.sendLockAEdit(sendMessage, [res]);
                this.getLastSave(id, "UPDATE");
                window[`gantt${this.store}`].open(id);
                this.getTaskParentData(id);
                const listGroupMember = await Util.getApi(
                  "GET",
                  "/project/listGroupMember",
                  {
                    billnum: "rdpmPrjModal",
                    projectId: projectId,
                  },
                  false
                );
                this.setState(
                  {
                    showDefault: false,
                    decompositionId: id,
                    listGroupMember: listGroupMember || [],
                    progressOutId:
                      task.classifyCode === "PROGRESS" ||
                      task.classifyCode === "WAITING"
                        ? task.id
                        : null,
                  },
                  () => {
                    cb.loader.runCommandLine(
                      "bill",
                      {
                        billtype: "VoucherList",
                        billno: "rdpmPrjProcessTplPop",
                        params: {
                          query: {},
                          menuId: false,
                          metaType: "VoucherList",
                          // mode: "edit",
                          gridButtoncallBack: this.gridCallBack,
                        },
                      },
                      pageModel
                    );
                  }
                );
              } catch (e) {
                this.setState({
                  showDefault: false,
                });
              }
            }
          );
        }
      }
    };
  };
  // 分解
  gridCallBack = async (obj) => {
    const { pageModel } = this.props;
    const {
      decompositionId,
      projectId,
      parentTaskIds,
      listGroupMember,
      saveLink,
      beforeChangeData,
      progressOutId,
    } = this.state;
    this.setState({
      showDefault: true,
    });
    const task = this.getTaskMessage(decompositionId);
    const newTask = { ...task };
    let result;
    try {
      result = await Util.getApi("GET", "/bill/detail", {
        billnum: "rdpmPrjProcessTpl",
        id: obj[0].id,
      });
    } catch (e) {
      cb.utils.alert(e.message, "error");
      this.setState({
        showDefault: false,
      });
      return;
    }

    let links = [];
    const formatFunc = window[`gantt${this.store}`].date.date_to_str(
      "%d-%m-%Y"
    );
    const { prjProcessTplAtList, prjProcessTplAtLkList } = result;
    let startId, endId;
    let res = prjProcessTplAtList.map((i, index) => {
      const newItm = { ...i };
      if (newItm.code == "start") {
        newItm.start_date = task.start_date;
        startId = newItm.id;
      }
      if (newItm.code === "end") {
        endId = newItm.id;
      }
      newItm.e_id = `${
        Number(String(new Date().getTime()).slice(-10)) + index
      }`;
      newItm.e_code = `task${
        Number(String(new Date().getTime()).slice(-8)) + index
      }`;
      return newItm;
    });
    let addSuccessId = [];
    let parentIdArray = [decompositionId];
    let parentSendM = [];
    let parentSendR = [];
    let reorderArray = Util.getTrueArrT(startId, prjProcessTplAtLkList);
    let resFilter = res.filter((k) => k.code !== "end" && k.code !== "start");
    const p = (createTask) => {
      let sendMessage = [
        {
          paramVersion: 0,
          timeVersion: 0,
          text: createTask.text,
          code: createTask.code,
          id: createTask.id,
        },
      ];
      return new Promise(async (resolve, reject) => {
        window[`gantt${this.store}`].addTask(
          { ...createTask },
          decompositionId
        );
        try {
          this.wsSendMeeage("LOCK", sendMessage);
          await this.getMessage();
          const addTask = this.getTaskMessage(createTask.id);
          const newResult = this.getNeedData(addTask);
          this.wsSendMeeage("EDIT", [newResult]);
          await this.getMessage();
          this.getLastSave(createTask.id, "ADD");
          if (parentTaskIds || progressOutId) {
            const rootTask = progressOutId
              ? this.getTaskMessage(progressOutId)
              : this.getTaskMessage(parentTaskIds);
            const addTask = this.getTaskMessage(createTask.id);
            if (+addTask.end_date > +rootTask.end_date) {
              this.promptInformation("分解失败，超出最后工期！", "danger");
              this.setState({
                showDefault: false,
              });
              addSuccessId.push(createTask.id);
              reject();
            } else {
              addSuccessId.push(createTask.id);
              resolve();
            }
          } else {
            addSuccessId.push(createTask.id);
            resolve();
          }
        } catch (e) {
          addSuccessId.push(createTask.id);
          reject();
        }
      });
    };
    const getAllData = pageModel.getAllData();
    // reorderArray = reorderArray.sort(
    //   (a, b) => a.startActiveId_id - b.startActiveId_id
    // );
    for (let j = 0; j < reorderArray.length; j++) {
      const start = Util.byIdgetTask(res, reorderArray[j].startActiveId);
      const end = Util.byIdgetTask(res, reorderArray[j].endActiveId);
      for (let index = 0; index < resFilter.length; index++) {
        let taskNewType;
        if (end.taskType === 1) {
          taskNewType = "TASK";
        } else if (end.taskType === 2) {
          taskNewType = "SPECIAL";
        } else {
          taskNewType = "MIESTONE";
        }
        let createTask = {};
        listGroupMember.length > 0 &&
          listGroupMember.forEach((item) => {
            if (Number(item.roleId) === Number(end.role)) {
              createTask.principalRole = end.role;
              createTask.principalRole_name = end.role_name;
              if (item.member) {
                createTask.principal = item.member;
                createTask.grpMember_name = item.member_name;
              } else if (Number(item.member) === Number(getAllData.principal)) {
                createTask.principal = item.member;
                createTask.grpMember_name = item.member_name;
              }
            } else if (Number(item.member) === Number(getAllData.principal)) {
              createTask.principal = item.member;
              createTask.grpMember_name = item.member_name;
              createTask.principalRole = item.roleId;
              createTask.principalRole_name = item.roleId_name;
            }
          });
        // role 角色 interactorType 交付物
        createTask.id = end.e_id;
        createTask.duration = end.duration;
        createTask.code = end.e_code;
        createTask.text = end.name;
        createTask.beParent = decompositionId;
        createTask.parent = decompositionId;
        createTask.description = end.description;
        createTask.projectId = projectId;
        createTask.taskType = taskNewType;
        createTask.createorg = getAllData.createorg;
        createTask.ownedorg = getAllData.ownedorg;
        createTask.outputType = end.interactorType;
        createTask.outputType_name = end.interactorType_name;
        createTask.type = end.taskType === 3 ? "milestone" : "task";
        // 设计规范
        createTask.docId = end.docId;
        createTask.checklistTplId = end.ckTplId;
        if (resFilter[index].id == reorderArray[j].endActiveId) {
          if (start.code === "start") {
            createTask.start_date = formatFunc(start.start_date);
          } else {
            const pTask = this.getTaskMessage(start.e_id);
            if (Number(reorderArray[j].lineType) === 0) {
              createTask.start_date = pTask.end_date;
            } else if (Number(reorderArray[j].lineType) === 1) {
              createTask.start_date = pTask.start_date;
            } else if (Number(reorderArray[j].lineType) === 2) {
              createTask.end_date = pTask.end_date;
            } else {
              createTask.end_date = pTask.start_date;
            }
          }
          if (!window[`gantt${this.store}`].isTaskExists(createTask.id)) {
            try {
              await p(createTask);
            } catch (e) {
              addSuccessId.map((item) => {
                window[`gantt${this.store}`].deleteTask(item);
              });
              this.getLastSave(addSuccessId, "DELETE");
              if (
                !window[`gantt${this.store}`].getChildren(decompositionId)
                  .length
              ) {
                if (!(parentTaskIds && task.parent === 0)) {
                  let decompositionIdTask = this.getTaskMessage(
                    decompositionId
                  );
                  decompositionIdTask.start_date = newTask.start_date;
                  decompositionIdTask.end_date = newTask.end_date;
                  window[`gantt${this.store}`].refreshTask(decompositionId);
                }
              }
              window[`gantt${this.store}`].render();
              this.setState({
                showDefault: false,
              });
              return;
            }
          }
        }
      }
    }
    const current_state = this.getTaskParentData(decompositionId, false);
    parentIdArray = [
      ...parentIdArray,
      ...Util.getDifferentData(beforeChangeData, current_state),
    ];
    parentIdArray.forEach((item) => {
      const itemTask = this.getTaskMessage(item);
      parentSendM.push({
        taskKey: itemTask.taskKey,
        paramVersion: itemTask.paramVersion,
        timeVersion: itemTask.timeVersion,
        text: itemTask.text,
        code: itemTask.code,
        id: itemTask.id,
      });
      let res = this.getNeedData({ ...itemTask });
      parentSendR.push(res);
    });
    try {
      await this.sendLockAEdit(parentSendM, parentSendR);
      this.getLastSave(parentIdArray, "UPDATE");
      this.refreshSummaryProgress(decompositionId, true);
    } catch (e) {
      addSuccessId.map((item) => {
        window[`gantt${this.store}`].deleteTask(item);
      });
      if (!window[`gantt${this.store}`].getChildren(decompositionId).length) {
        if (!(parentTaskIds && task.parent === 0)) {
          let decompositionIdTask = this.getTaskMessage(decompositionId);
          decompositionIdTask.type =
            window[`gantt${this.store}`].config.types.task;
          decompositionIdTask.start_date = newTask.start_date;
          decompositionIdTask.end_date = newTask.end_date;
          window[`gantt${this.store}`].refreshTask(decompositionId);
        }
      }
      this.getLastSave(addSuccessId, "DELETE");
      window[`gantt${this.store}`].render();
      this.setState({
        showDefault: false,
      });
      return;
    }
    let newprjProcessTplAtLkList = prjProcessTplAtLkList.map((i) => {
      let newI = { ...i };
      res.map((item) => {
        if (i.startActiveId === item.id) {
          newI.source = item.e_id;
        }
        if (i.endActiveId === item.id) {
          newI.target = item.e_id;
        }
      });
      return newI;
    });
    newprjProcessTplAtLkList
      .filter((i) => i.startActiveId !== startId && i.endActiveId !== endId)
      .map((item, index) => {
        links.push({
          id: `${Number(String(new Date().getTime()).slice(-10)) + index}`,
          source: item.source,
          target: item.target,
          type: String(item.lineType),
          lag: item.delayDay,
          handleType: "ADD",
          positionType: "BEFORE",
          projectId: projectId,
        });
      });
    window[`gantt${this.store}`].parse({
      data: [],
      links: links,
    });
    let resLink = [...saveLink];
    let decomposition = links.filter(
      (i) => i.source !== undefined && i.target !== undefined
    );
    decomposition = decomposition.map((item) => {
      let deItem = { ...item };
      const taskSource = this.getTaskMessage(item.source);
      const taskTarget = this.getTaskMessage(item.target);
      deItem.sourceTaskCode = taskSource.code;
      deItem.targetTaskCode = taskTarget.code;
      return deItem;
    });
    resLink = [...resLink, ...decomposition];
    this.setState({
      saveLink: resLink,
      showDefault: false,
    });
  };
  // 计算子节点修改进度
  calculateSummaryProgress = (task) => {
    if (!window[`gantt${this.store}`].hasChild(task.id)) return task.progress;
    const p = (id) => {
      let res = 0;
      let childrenArray = window[`gantt${this.store}`].getChildren(id);
      childrenArray = childrenArray.filter((item) => {
        const task = window[`gantt${this.store}`].getTask(item);
        if (task.type !== "milestone") {
          return item;
        }
      });
      childrenArray.map((item) => {
        const task = window[`gantt${this.store}`].getTask(item);
        if (task.type == window[`gantt${this.store}`].config.types.project) {
          res += p(item) / childrenArray.length;
        } else {
          res += task.progress / childrenArray.length;
        }
      });
      return res;
    };
    return p(task.id);
  };
  // 父节点自动更新进度
  refreshSummaryProgress = (id, submit) => {
    if (!window[`gantt${this.store}`].isTaskExists(id)) return;

    let task = window[`gantt${this.store}`].getTask(id);
    task.progress = this.calculateSummaryProgress(task);
    if (!submit) {
      window[`gantt${this.store}`].refreshTask(id);
    } else {
      window[`gantt${this.store}`].updateTask(id);
    }

    if (
      !submit &&
      window[`gantt${this.store}`].getParent(id) !==
        window[`gantt${this.store}`].config.root_id
    ) {
      this.refreshSummaryProgress(
        window[`gantt${this.store}`].getParent(id),
        submit
      );
    }
  };
  // 得到所有当前节点的所有父级
  getTaskParentData = (id, type = true) => {
    let data = [];
    if (id) {
      window[`gantt${this.store}`].eachParent(function (task) {
        data.push({ ...task });
      }, id);
    } else {
      data = JSON.parse(
        JSON.stringify(window[`gantt${this.store}`].serialize().data)
      );
    }

    if (type) {
      this.setState({
        beforeChangeData: data,
      });
    } else {
      return data;
    }
  };
  // 弹窗确定事件
  modalOkAction = async (type, obj, id, version, otherMessage) => {
    this.setState({
      showDefault: true,
    });
    const { dirtyData, decompositionId, beforeChangeData } = this.state;
    let newDirtyData = [...dirtyData];
    if (type === "add") {
      let task = this.getTaskUpdata(obj);
      task.parent = decompositionId;
      let addParentChangeId = [decompositionId];
      let sendMessage = [];
      let parentSendR = [];
      // const beforeChangeData = this.getTaskParentData(id, false);
      window[`gantt${this.store}`].addTask(task, decompositionId, 0);
      const current_state = this.getTaskParentData(decompositionId, false);
      addParentChangeId = [
        ...addParentChangeId,
        ...Util.getDifferentData(beforeChangeData, current_state),
      ];
      addParentChangeId.forEach((item) => {
        const itemTask = this.getTaskMessage(item);
        sendMessage.push({
          taskKey: itemTask.taskKey,
          paramVersion: itemTask.paramVersion,
          timeVersion: itemTask.timeVersion,
          text: itemTask.text,
          code: itemTask.code,
          id: itemTask.id,
        });
        let res = this.getNeedData({ ...itemTask });
        parentSendR.push(res);
      });
      try {
        this.wsSendMeeage("LOCK", [
          {
            taskKey: task.taskKey,
            paramVersion: task.paramVersion,
            timeVersion: task.timeVersion,
            text: task.text,
            code: task.code,
            id: task.id,
          },
          ...sendMessage,
        ]);
        await this.getMessage();
        const newTask = this.getTaskMessage(id);
        const newResult = this.getNeedData({ ...newTask });
        newResult.beParent = newResult.parent;
        this.wsSendMeeage("EDIT", [newResult, ...parentSendR]);
        await this.getMessage();
        this.getLastSave(id, "ADD");
        this.getLastSave(addParentChangeId, "UPDATE");
        this.refreshSummaryProgress(
          window[`gantt${this.store}`].getParent(id),
          true
        );
        window[`gantt${this.store}`].autoSchedule();
        this.setState({
          showDefault: false,
        });
        if (
          otherMessage &&
          (otherMessage.rdpmPrjRefDataList ||
            otherMessage.prjOutputList ||
            otherMessage.prjTaskDocLinkList ||
            otherMessage.prjOutputLinkList ||
            otherMessage.prjTaskBudgetList ||
            otherMessage.prjTaskCheckItemList ||
            otherMessage.prjTaskQualityList ||
            otherMessage.prjRiskList ||
            otherMessage.prjTaskDesignDocLinkList ||
            otherMessage.prjTaskTimeList)
        ) {
          newDirtyData.push({
            id,
            data: otherMessage,
          });
          this.setState({
            dirtyData: newDirtyData,
          });
        }
      } catch (e) {
        this.setState({
          showDefault: false,
        });
        window[`gantt${this.store}`].deleteTask(id);
      }
    } else {
      this.getTaskParentData(null);
      const task = this.getTaskUpdata(obj, id);
      const changeTask = this.getTaskMessage(task.id);
      Object.keys(task).forEach((keys) => {
        if (keys === "start_date" || keys === "end_date") {
          changeTask[keys] = window[`gantt${this.store}`].date.parseDate(
            task[keys],
            "%d-%m-%Y"
          );
        } else {
          changeTask[keys] = task[keys];
        }
      });
      window[`gantt${this.store}`].updateTask(changeTask.id);
      if (
        otherMessage &&
        (otherMessage.rdpmPrjRefDataList ||
          otherMessage.prjOutputList ||
          otherMessage.prjTaskDocLinkList ||
          otherMessage.prjOutputLinkList ||
          otherMessage.prjTaskBudgetList ||
          otherMessage.prjTaskCheckItemList ||
          otherMessage.prjTaskQualityList ||
          otherMessage.prjRiskList ||
          otherMessage.prjTaskDesignDocLinkList ||
          otherMessage.prjTaskTimeList)
      ) {
        newDirtyData.push({
          id,
          data: otherMessage,
        });
        this.setState({
          dirtyData: newDirtyData,
        });
      }
      if (version === "PARAMS") {
        const sendMessage = [
          {
            taskKey: task.taskKey,
            paramVersion: task.paramVersion,
            text: task.text,
            code: task.code,
            id: task.id,
          },
        ];
        try {
          const result = this.getNeedData({ ...task });
          await this.sendLockAEdit(sendMessage, [result]);
          this.getLastSave(id, "UPDATE");
          this.refreshSummaryProgress(
            window[`gantt${this.store}`].getParent(id),
            true
          );
          this.setState({
            showDefault: false,
          });
        } catch (e) {
          window[`gantt${this.store}`].undo();
          this.setState({
            showDefault: false,
          });
        }
      } else {
        this.setState(
          {
            paramsAndTime: version === "PANDT" ? true : false,
            modalOnok: version === "PANDT" ? true : false,
          },
          () => {
            window[`gantt${this.store}`].autoSchedule(task.id);
          }
        );
      }
    }
  };
  // 得到弹窗修改的值
  getTaskUpdata = (obj, id) => {
    const formatFunc = window[`gantt${this.store}`].date.date_to_str(
      "%d-%m-%Y"
    );
    let task = id ? { ...this.getTaskMessage(id) } : {};
    Object.keys(obj).map((item) => {
      if (item === "start_date" || item === "end_date") {
        task[item] = formatFunc(new Date(obj[item]));
      } else {
        task[item] = obj[item];
      }
    });
    return task;
  };
  // 删除节点
  deleteTask = async (id) => {
    this.setState({
      showDefault: true,
    });
    const { beforeChangeData } = this.state;
    const task = this.getTaskMessage(id);
    const result = this.getNeedData({ ...task });
    const parentId = window[`gantt${this.store}`].getParent(id);
    const parentTask = this.getTaskMessage(parentId);
    window[`gantt${this.store}`].deleteTask(id);
    let deleteIdArray = [];
    let sendMessage = [];
    let parentSendR = [];
    const current_state = [
      ...this.getTaskParentData(parentId, false),
      parentTask,
    ];
    deleteIdArray = [
      ...deleteIdArray,
      ...Util.getDifferentData(beforeChangeData, current_state),
    ];
    deleteIdArray.forEach((item) => {
      const itemTask = this.getTaskMessage(item);
      sendMessage.push({
        taskKey: itemTask.taskKey,
        paramVersion: itemTask.paramVersion,
        timeVersion: itemTask.timeVersion,
        text: itemTask.text,
        code: itemTask.code,
        id: itemTask.id,
      });
      let res = this.getNeedData({ ...itemTask });
      parentSendR.push(res);
    });
    try {
      await this.sendLockAEdit(
        [
          {
            taskKey: task.taskKey,
            paramVersion: task.paramVersion,
            timeVersion: task.timeVersion,
            text: task.text,
            code: task.code,
            id: task.id,
          },
          ...sendMessage,
        ],
        [result, ...parentSendR],
        "DELETE"
      );
      this.setState({
        showDefault: false,
      });
      this.getLastSave(id, "DELETE", { ...task });
      this.getLastSave(deleteIdArray, "UPDATE");
      this.refreshSummaryProgress(parentId, true);
    } catch (e) {
      this.setState({
        showDefault: false,
      });
      window[`gantt${this.store}`].undo();
    }
  };
  // 删除和新增线成功后自动排程
  dAndAToAuto = async (taskIdmessageArr, result, dLink, type) => {
    try {
      this.dAndAToAutoTime && clearTimeout(this.dAndAToAutoTime);
      this.dAndAToAutoTime = null;
      this.saveChangeLink(dLink);
      await this.sendLockAEdit(taskIdmessageArr, result);
      this.getLastSave([dLink.source, dLink.target], "UPDATE");
      this.getTaskParentData(null);
      this.setState(
        {
          addAndDetelLinkId: `${dLink.id}-${type}`,
        },
        () => {
          this.dAndAToAutoTime = setTimeout(() => {
            window[`gantt${this.store}`].config.auto_scheduling = true;
            window[`gantt${this.store}`].render();
            window[`gantt${this.store}`].autoSchedule(dLink.target);
            this.setState({
              showDefault: false,
            });
          }, 10);
        }
      );
    } catch (e) {
      window[`gantt${this.store}`].undo();
      window[`gantt${this.store}`].config.auto_scheduling = true;
      window[`gantt${this.store}`].render();
      this.deleteLinkDate(dLink.id);
      this.setState({
        addAndDetelLinkId: null,
        showDefault: false,
      });
    }
  };
  // 自动排程加锁失败，线回删
  deleteLinkDate = (id) => {
    const { saveLink } = this.state;
    let res = [...saveLink];
    res = res.filter((item) => item.id !== id);
    this.setState({
      saveLink: res,
    });
  };
  // lock和edit
  sendLockAEdit = (
    firstMessage,
    secondMessage,
    secondType = "EDIT",
    firstType = "LOCK"
  ) => {
    console.log(firstMessage, secondMessage);
    return new Promise(async (resolve, reject) => {
      if (firstMessage.length > 0) {
        try {
          this.wsSendMeeage(firstType, firstMessage);
          await this.getMessage();
          this.wsSendMeeage(secondType, secondMessage);
          await this.getMessage();
          resolve();
        } catch (e) {
          reject();
        }
      } else {
        resolve();
      }
    });
  };
  // 暂存线
  saveChangeLink = (obj) => {
    const { saveLink } = this.state;
    let res = [...saveLink];
    if (res.some((item) => item.id == obj.id)) {
      if (obj.handleType === "DELETE") {
        res = res.filter(
          (item) =>
            (item.id == obj.id && item.handleType !== "ADD") ||
            item.id != obj.id
        );
      }
    } else {
      res.push(obj);
    }
    this.setState({
      saveLink: res,
    });
  };
  // 限制拖拽时间
  limitMoveLeft = (task, parentTask) => {
    const dur = task.end_date - task.start_date;
    task.end_date = new Date(
      window[`gantt${this.store}`].date.parseDate(
        parentTask.end_date,
        "%d-%m-%Y"
      )
    );
    task.start_date = new Date(+task.end_date - dur);
  };
  // 限制拖拽时间
  limitMoveRight = (task, parentTask) => {
    const dur = task.end_date - task.start_date;
    task.start_date = new Date(
      window[`gantt${this.store}`].date.parseDate(
        parentTask.start_date,
        "%d-%m-%Y"
      )
    );
    task.end_date = new Date(+task.start_date + dur);
  };
  // 限制拖拽时间
  limitResizeLeft = (task, parentTask) => {
    task.end_date = new Date(
      window[`gantt${this.store}`].date.parseDate(
        parentTask.end_date,
        "%d-%m-%Y"
      )
    );
  };
  // 限制拖拽时间
  limitResizeRight = (task, parentTask) => {
    task.start_date = new Date(
      window[`gantt${this.store}`].date.parseDate(
        parentTask.start_date,
        "%d-%m-%Y"
      )
    );
  };
  pakoGzip = (message) => {
    return Util.arrayBufferToBase64(pako.gzip(JSON.stringify(message)));
  };
  // 发送数据
  wsSendMeeage = (type, sendMessage) => {
    const r = JSON.stringify({
      requestCode: type,
      taskNodeArray: this.pakoGzip(sendMessage),
    });
    console.log(r, "e\rrrrrrrrrrrrrrr");
    if (window[`${this.store}_ws`].readyState == 1) {
      window[`${this.store}_ws`].send(r);
    } else {
      this.setState({
        isEdit: true,
        showDefault: false,
      });
      this.lockedTaskDataTimer && clearInterval(this.lockedTaskDataTimer);
    }
  };
  // 得到最后保存的值
  getLastSave = (id, type, deleteTask) => {
    const { saveData } = this.state;
    let res = [...saveData];
    const idArray = Array.isArray(id) ? id : [id];
    idArray.forEach(async (i) => {
      if (!res.some((item) => Number(item.id) === Number(i))) {
        let task;
        if (type === "DELETE") {
          task = deleteTask;
        } else {
          task = this.getTaskMessage(i);
        }
        let parentTask;
        if (window[`gantt${this.store}`].isTaskExists(task.parent)) {
          parentTask = this.getTaskMessage(task.parent);
        }
        // let prjTaskDesignDocLinkList;
        // if (task.docId) {
        //   const prjTaskDesignDocLinkList = await Util.getApi(
        //     "get",
        //     "/bill/detail",
        //     {
        //       billnum: "40deda4a-a9ea-460f-93f4-21e3fa85914d",
        //       id: task.docId,
        //     },
        //     false,
        //     "IMP-GDS"
        //   );
        //   console.log(prjTaskDesignDocLinkList, 111);
        // }
        res.push({
          id: Number(i),
          handleType: type,
          taskKey: task.taskKey,
          paramVersion: task.paramVersion,
          timeVersion: task.timeVersion,
          parent: task.parent,
          parentCode: parentTask ? parentTask.code : 0,
          prjTaskDesignDocLinkList: task.docId
            ? [
                {
                  docId: task.docId,
                  _status: "Insert",
                  hasDefaultInit: true,
                  _tableDisplayOutlineAll: false,
                },
              ]
            : [],
        });
      } else {
        if (type === "DELETE") {
          res = res.filter(
            (item) =>
              (item.handleType !== "ADD" && Number(item.id) == Number(i)) ||
              Number(item.id) !== Number(i)
          );
        }
        res = res.map((item) => {
          let newItem = { ...item };
          if (Number(item.id) === Number(i)) {
            let task;
            if (type === "DELETE") {
              task = deleteTask;
            } else {
              task = this.getTaskMessage(i);
            }
            newItem.paramVersion = task.paramVersion;
            newItem.timeVersion = task.timeVersion;
            if (newItem.handleType !== "ADD") {
              newItem.handleType = type;
            }
          }
          return newItem;
        });
      }
    });
    this.setState({
      saveData: res,
    });
  };
  // 搜索框改变
  onChange = (value) => {
    this.setState({ searchValue: value });
  };
  // 查询
  onSearch = (value) => {
    const _this = this;
    const { onSearchIndex, noChangeValue } = this.state;
    if (!value) return;
    let hasSearchData = [];
    const ganttAllTask = window[`gantt${this.store}`].getTaskByTime();
    ganttAllTask.forEach((item) => {
      if (item.text.indexOf(value) != -1) {
        hasSearchData.push(item);
      }
    });
    if (hasSearchData.some((item) => item.text.indexOf(value) != -1)) {
      this.setState(
        {
          oAndCtaskS: false,
          searchOpenTask: true,
        },
        () => {
          let index = onSearchIndex;
          if (
            (value === noChangeValue &&
              onSearchIndex === hasSearchData.length) ||
            value !== noChangeValue
          ) {
            index = 0;
          }
          window[`gantt${this.store}`].eachParent(function (task) {
            window[`gantt${_this.store}`].open(task.id);
          }, hasSearchData[index].id);
          window[`gantt${this.store}`].render();
          hasSearchData.sort((a, b) => {
            return a.$index - b.$index;
          });
          if (
            window[`gantt${this.store}`].isTaskExists(hasSearchData[index].id)
          ) {
            window[`gantt${this.store}`].unselectTask();
            window[`gantt${this.store}`].selectTask(hasSearchData[index].id);
            window[`gantt${this.store}`].showTask(hasSearchData[index].id);
          }
          this.setState({
            onSearchIndex: index + 1,
            noChangeValue: value,
            searchOpenTask: false,
          });
        }
      );
    }
  };
  // 选择时间
  gotoTime = (type) => {
    const dateToStr = window[`gantt${this.store}`].date.date_to_str(
      window[`gantt${this.store}`].config.task_date
    );
    const data = window[`gantt${this.store}`].getSubtaskDates();
    switch (type) {
      case "now":
        const today = new Date();
        window[`gantt${this.store}`].addMarker({
          start_date: today,
          css: "today",
          text: "今天",
          title: "今天: " + dateToStr(today),
        });
        window[`gantt${this.store}`].showDate(today);
        break;
      case "start":
        window[`gantt${this.store}`].addMarker({
          start_date: data.start_date,
          css: "status_line",
          text: "开始时间",
          title: "开始时间: " + dateToStr(data.start_date),
        });
        window[`gantt${this.store}`].showDate(data.start_date);
        break;
      case "end":
        window[`gantt${this.store}`].addMarker({
          start_date: data.end_date,
          css: "status_line",
          text: "结束时间",
          title: "结束时间: " + dateToStr(data.end_date),
        });
        window[`gantt${this.store}`].showDate(data.end_date);
        break;
      default:
        break;
    }
  };
  // 展开/收缩所有分支
  oAndCtask = () => {
    const { oAndCtaskS, toggleModeStatus } = this.state;
    window[`gantt${this.store}`].eachTask(function (task) {
      task.$open = oAndCtaskS;
    });
    this.setState(
      {
        oAndCtaskS: !oAndCtaskS,
        toggleModeStatus: toggleModeStatus === false ? true : toggleModeStatus,
      },
      () => {
        window[`gantt${this.store}`].render();
      }
    );
  };
  // 全局可视化
  toggleMode = () => {
    const { toggleModeStatus, durationUnit } = this.state;
    window[`gantt${this.store}`].config.duration_unit = toggleModeStatus
      ? "year"
      : durationUnit;
    this.setState(
      {
        toggleModeStatus: !toggleModeStatus,
      },
      () => {
        if (toggleModeStatus) {
          this.saveConfig();
          this.zoomToFit();
        } else {
          this.restoreConfig();
          window[`gantt${this.store}`].render();
        }
      }
    );
  };
  restoreConfig = () => {
    this.applyConfig(cachedSettings);
  };
  saveConfig = () => {
    let config = window[`gantt${this.store}`].config;
    cachedSettings.scales = config.scales;
    cachedSettings.start_date = config.start_date;
    cachedSettings.end_date = config.end_date;
  };
  zoomToFit = () => {
    let project = window[`gantt${this.store}`].getSubtaskDates(),
      areaWidth = window[`gantt${this.store}`].$task.offsetWidth;
    let i;
    let _this = this;
    const scaleConfigs = [
      // decades
      {
        scales: [
          {
            subscale_unit: "year",
            unit: "year",
            step: 10,
            template: function (date) {
              const dateToStr = window[`gantt${_this.store}`].date.date_to_str(
                "%Y"
              );
              const endDate = window[`gantt${_this.store}`].date.add(
                window[`gantt${_this.store}`].date.add(date, 10, "year"),
                -1,
                "day"
              );
              return dateToStr(date) + " - " + dateToStr(endDate);
            },
          },
          {
            unit: "year",
            step: 100,
            template: function (date) {
              const dateToStr = window[`gantt${_this.store}`].date.date_to_str(
                "%Y"
              );
              const endDate = window[`gantt${_this.store}`].date.add(
                window[`gantt${_this.store}`].date.add(date, 100, "year"),
                -1,
                "day"
              );
              return dateToStr(date) + " - " + dateToStr(endDate);
            },
          },
        ],
      },
      // years
      {
        scales: [
          { subscale_unit: "year", unit: "year", step: 1, date: "%Y" },
          {
            unit: "year",
            step: 5,
            template: function (date) {
              const dateToStr = window[`gantt${_this.store}`].date.date_to_str(
                "%Y"
              );
              const endDate = window[`gantt${_this.store}`].date.add(
                window[`gantt${_this.store}`].date.add(date, 5, "year"),
                -1,
                "day"
              );
              return dateToStr(date) + " - " + dateToStr(endDate);
            },
          },
        ],
      },
      // quarters
      {
        scales: [
          { subscale_unit: "month", unit: "year", step: 3, format: "%Y" },
          {
            unit: "month",
            step: 3,
            template: function (date) {
              const dateToStr = window[`gantt${_this.store}`].date.date_to_str(
                "%M"
              );
              const endDate = window[`gantt${_this.store}`].date.add(
                window[`gantt${_this.store}`].date.add(date, 3, "month"),
                -1,
                "day"
              );
              return dateToStr(date) + " - " + dateToStr(endDate);
            },
          },
        ],
      },
      // months
      {
        scales: [
          { subscale_unit: "month", unit: "year", step: 1, format: "%Y" },
          { unit: "month", step: 1, format: "%M" },
        ],
      },
      // weeks
      {
        scales: [
          { subscale_unit: "week", unit: "month", step: 1, date: "%F" },
          {
            unit: "week",
            step: 1,
            template: function (date) {
              const dateToStr = window[`gantt${_this.store}`].date.date_to_str(
                "%d %M"
              );
              const endDate = window[`gantt${_this.store}`].date.add(
                window[`gantt${_this.store}`].date.add(date, 1, "week"),
                -1,
                "day"
              );
              return dateToStr(date) + " - " + dateToStr(endDate);
            },
          },
        ],
      },
      // days
      {
        scales: [
          { subscale_unit: "day", unit: "month", step: 1, format: "%F" },
          { unit: "day", step: 1, format: "%j" },
        ],
      },
      // hours
      {
        scales: [
          { subscale_unit: "hour", unit: "day", step: 1, format: "%j %M" },
          { unit: "hour", step: 1, format: "%H:%i" },
        ],
      },
      // minutes
      {
        scales: [
          { subscale_unit: "minute", unit: "hour", step: 1, format: "%H" },
          { unit: "minute", step: 1, format: "%H:%i" },
        ],
      },
    ];
    for (i = 0; i < scaleConfigs.length; i++) {
      let columnCount = this.getUnitsBetween(
        project.start_date,
        project.end_date,
        scaleConfigs[i].scales[0].subscale_unit,
        scaleConfigs[i].scales[0].step
      );
      if (
        (columnCount + 2) *
          window[`gantt${this.store}`].config.min_column_width >=
        areaWidth
      ) {
        --i;
        break;
      }
    }
    if (i == scaleConfigs.length) {
      i--;
    }
    this.applyConfig(scaleConfigs[i], project);
    window[`gantt${this.store}`].render();
  };
  applyConfig = (config, dates) => {
    window[`gantt${this.store}`].config.scales = config.scales;
    if (dates && dates.start_date && dates.end_date) {
      window[`gantt${this.store}`].config.start_date = window[
        `gantt${this.store}`
      ].date.add(dates.start_date, -1, config.scales[0].subscale_unit);
      window[`gantt${this.store}`].config.end_date = window[
        `gantt${this.store}`
      ].date.add(
        window[`gantt${this.store}`].date[
          config.scales[0].subscale_unit + "_start"
        ](dates.end_date),
        2,
        config.scales[0].subscale_unit
      );
    } else {
      window[`gantt${this.store}`].config.start_date = window[
        `gantt${this.store}`
      ].config.end_date = null;
    }
  };
  getUnitsBetween = (from, to, unit, step) => {
    let start = new Date(from),
      end = new Date(to);
    let units = 0;
    while (start.valueOf() < end.valueOf()) {
      units++;
      start = window[`gantt${this.store}`].date.add(start, step, unit);
    }
    return units;
  };
  // 时间段展示
  setLevel = (type) => {
    const { toggleModeStatus } = this.state;
    window[`gantt${this.store}`].config.duration_unit = type;
    let durationUnit = type;
    this.setState(
      {
        toggleModeStatus: toggleModeStatus === false ? true : toggleModeStatus,
        durationUnit,
      },
      () => {
        window[`gantt${this.store}`].ext.zoom.setLevel(type);
      }
    );
  };
  // 导出
  exportExcel = () => {
    const data = window[`gantt${this.store}`].serialize().data.map((item) => {
      let newItem = { ...item };
      newItem.wbs = window[`gantt${this.store}`].getWBSCode(
        this.getTaskMessage(item.id)
      );
      newItem.progress = Util.mul(item.progress, 100);
      return newItem;
    });
    gantt.exportToExcel({
      data,
      columns: [
        { id: "wbs", header: "WBS", width: 20 },
        { id: "code", header: "编码", width: 20 },
        { id: "text", header: "名称", width: 20 },
        { id: "text", header: "任务类型", width: 20 },
        { id: "description", header: "备注", width: 50 },
        { id: "text", header: "任务负责人", width: 20 },
        {
          id: "start_date",
          header: "计划开始时间",
          width: 30,
          type: "date",
        },
        {
          id: "end_date",
          header: "计划结束时间",
          width: 30,
          type: "date",
        },
        {
          id: "duration",
          header: "计划工期",
          width: 20,
          type: "number",
        },
        {
          id: "progress",
          header: "完成百分比(%)",
          width: 20,
          type: "number",
        },
        { id: "creator", header: "创建者", width: 20 },
      ],
    });
  };
  // 根据ID得到Task节点
  getTaskMessage = (id) => {
    return window[`gantt${this.store}`].getTask(id);
  };
  // 判断task是否在甘特图上存在
  isTaskExists = (id) => {
    return window[`gantt${this.store}`].isTaskExists(id);
  };
  // 将指定格式的字符串转换为Date对象
  parseDate = (time) => {
    return window[`gantt${this.store}`].date.parseDate(time, "%d-%m-%Y");
  };
  // 得到后端需要过滤的数据
  getNeedData = (task) => {
    // 将Date对象转换为指定格式的字符串的函数
    const formatFunc = window[`gantt${this.store}`].date.date_to_str(
      "%d-%m-%Y"
    );
    let res = {};
    Object.keys(task).forEach((item) => {
      if (this.needObjArr.includes(item)) {
        if (item === "start_date" || item === "end_date") {
          if (typeof task[item] === "string") {
            res[item] = task[item];
          } else {
            res[item] = formatFunc(task[item]);
          }
        } else if (item === "progress") {
          res[item] = Util.mul(Util.keepTwoDecimalFull(task[item]), 100);
        } else {
          res[item] = task[item];
        }
      }
    });
    return res;
  };
  // 将Date对象转换为指定格式的字符串函数
  dateConversionString = (time) => {
    const formatFunc = window[`gantt${this.store}`].date.date_to_str(
      "%Y-%m-%d"
    );
    return formatFunc(time);
  };
  // websocket断开重连
  reconnect = () => {
    const _this = this;
    const { isEdit } = _this.state;
    if (lockReconnect) return;
    lockReconnect = true;
    if (reconectNum < 3 && !isEdit) {
      this.reconnectTime && clearTimeout(this.reconnectTime);
      this.reconnectTime = setTimeout(function () {
        reconectNum++;
        lockReconnect = false;
        _this.getwebsocket();
      }, 6000);
    } else {
      _this.getErrorMessage();
      this.setState({
        isEdit: true,
      });
      this.lockedTaskDataTimer && clearInterval(this.lockedTaskDataTimer);
      lockReconnect = false;
    }
  };

  // websocket链接
  getwebsocket = async () => {
    const { token, projectId } = this.state;
    const _this = this;
    const url = `wss://imp-plm-daily.yyuap.com/websocket/websocket?projectId=${projectId}&token=${token}`;
    this.heartCheck = {
      severTimeout: 10000,
      timeoutObj: null,
      serverTimeOutObj: null,
      reset: function () {
        clearTimeout(this.timeoutObj);
        this.timeoutObj = null;
        clearTimeout(this.serverTimeOutObj);
        this.serverTimeOutObj = null;
        return this;
      },
      start: function () {
        const self = this;
        this.timeoutObj = setTimeout(function () {
          if (!_this.state.isEdit) {
            if (window[`${_this.store}_ws`].readyState != 1) {
              _this.reconnect(url);
            } else {
              window[`${_this.store}_ws`].send("PING");
              self.serverTimeOutObj = setTimeout(function () {
                window[`${_this.store}_ws`].close();
              }, self.severTimeout);
            }
          }
        }, _this.state.heartbeatInterval);
      },
    };
    if (
      !window[`${this.store}_ws`] ||
      (window[`${this.store}_ws`] && window[`${this.store}_ws`].readyState != 1)
    ) {
      window[`${this.store}_ws`] = new WebSocket(url);
      this.timeToConnet(10000);
      this.websocketInit();
    }
  };
  // 不知道websocket什么时候回调成功 轮询去查
  timeToConnet = (time) => {
    const _this = this;
    this.wsCheckSuccess && clearTimeout(this.wsCheckSuccess);
    this.wsCheckSuccess = setTimeout(function () {
      clearTimeout(_this.wsCheckSuccess);
      if (window[`${_this.store}_ws`].readyState == 3) {
        _this.reconnect();
      } else {
        _this.wsCheckSuccess = setTimeout(() => _this.timeToConnet(1000), 2000);
      }
    }, time);
  };
  websocketInit = async () => {
    const _this = this;
    //监听是否连接成功
    window[`${this.store}_ws`].onopen = function () {
      reconectNum = 0;
      _this.heartCheck.reset().start();
      _this.wsCheckSuccess && clearTimeout(_this.wsCheckSuccess);
      _this.reconnectTime && clearTimeout(_this.reconnectTime);
      _this.wsCheckSuccess = null;
      _this.reconnectTime = null;
      _this.lockedTaskDataTimer = setInterval(function () {
        let lockData = [];
        const ganttAllTask =
          (window[`gantt${_this.store}`] &&
            window[`gantt${_this.store}`].getTaskByTime()) ||
          [];
        ganttAllTask.forEach((item) => {
          if (item.paramLocked || item.timeLocked) {
            lockData.push({ id: item.id, taskKey: item.taskKey });
          }
        });
        if (lockData.length > 0) {
          _this.wsSendMeeage("LOCKED", lockData);
        }
      }, 300000);
    };

    //接听服务器发回的信息并处理展示
    try {
      await this.getMessage();
      this.setState(
        {
          isEdit: false,
          showDefault: false,
        },
        () => {
          window[`gantt${_this.store}`].render();
        }
      );
    } catch (e) {
      this.setState({
        isEdit: true,
        showDefault: false,
      });
    }

    //监听连接关闭事件
    window[`${this.store}_ws`].onclose = function (e) {
      const { isEdit } = _this.state;
      console.log(isEdit, e, window[`${_this.store}_ganttWebSocket`]);
      if (window[`${_this.store}_ganttWebSocket`]) {
        window[`${_this.store}_ganttWebSocket`] = false;
        delete window[`${_this.store}_ganttWebSocket`];
        delete window[`${_this.store}_ws`];
        _this.heartCheck.reset();
        if (!isEdit) {
          _this.setState({
            isEdit: true,
          });
        }
        return;
      } else if (isEdit) {
        // 第一点击连不去 调用接口 查询错误原因
        _this.getErrorMessage();
      } else {
        // 连接中断开重连
        lockReconnect = false;
        _this.heartCheck.reset();
        _this.reconnect();
      }
    };
    //监听并处理error事件
    window[`${this.store}_ws`].onerror = function (error) {
      console.log(11);
    };
  };
  // 连接不成功，获取后端报错原因
  getErrorMessage = async () => {
    const { token, projectId } = this.state;
    const url = `wss://imp-plm-daily.yyuap.com/websocket/websocket?projectId=${projectId}&token=${token}`;
    fetch(window.wsbErrorUrl + "/ws/linkErrorInfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access-control-allow-credentials": true,
      },
      body: JSON.stringify({
        data: {
          url,
        },
        domainKey: "IMP-PLM-RDPM-WS",
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        console.log(res);
        this.setState({
          showDefault: false,
          isEdit: true,
        });
        this.promptInformation(res.data.message);
      })
      .catch(() => {
        this.setState({
          showDefault: false,
          isEdit: true,
        });
        this.promptInformation("网络错误，连接失败！");
      });
    // let message;
    // try {
    //   const result = await Util.getApi("post", "/ws/linkErrorInfo", {
    //     data: {
    //       url,
    //     },
    //   });
    //   message = result.message;
    // } catch (e) {
    //   message = "网络错误，连接失败！";
    // }
    // this.setState({
    //   showDefault: false,
    //   isEdit: true,
    // });
    // this.promptInformation(message);
  };
  // websocket返回数据处理
  getMessage = () => {
    const { saveData, isEdit } = this.state;
    const _this = this;
    const P = new Promise((resolve, reject) => {
      window[`${this.store}_ws`].onmessage = function (data) {
        console.log(data.data);
        _this.heartCheck.reset().start();
        if (data.data !== "PONG") {
          const consequence = JSON.parse(data.data);
          const resultCode = consequence.code;
          const message = consequence.message;
          const requestCode = consequence.requestCode;
          const returnData = consequence.returnData
            ? JSON.parse(
                pako.inflate(Util.base64ToUint8Array(consequence.returnData), {
                  to: "string",
                })
              )
            : null;
          console.log(returnData, "returnData");
          if (message) {
            if (
              !(
                !isEdit &&
                (resultCode === "RELINK" ||
                  resultCode === "TIP" ||
                  resultCode === "PROCESS")
              )
            ) {
              _this.promptInformation(
                message,
                "info",
                resultCode === "TIP" ? 6 : 4,
                resultCode === "TIP" ? "topRight" : "top"
              );
            }
          }
          if (resultCode === "TIP") {
            if (returnData) {
              // 设置心跳时间
              _this.setState({
                heartbeatInterval: Util.mul(returnData.heartTime, 1000),
              });
            }
          } else if (resultCode === "RELINK") {
            if (returnData && saveData.length === 0) {
              // 设置编辑过的数据
              let resArr = [];
              returnData.forEach((item) => {
                if (_this.isTaskExists(item.id)) {
                  let parentTask;
                  const task = _this.getTaskMessage(item.id);
                  Object.keys(item).forEach((keys) => {
                    if (keys === "start_date" || keys === "end_date") {
                      task[keys] = window[`gantt${_this.store}`].date.parseDate(
                        item[keys],
                        "%d-%m-%Y"
                      );
                    } else if (keys === "progress") {
                      task[keys] = Util.div(
                        Util.keepTwoDecimalFull(item[keys]),
                        100
                      );
                    } else {
                      task[keys] = item[keys];
                    }
                  });
                  // 任务箱的第一条任务的父节点没有 但可能会被项目里面改变 所有重置回来
                  if (_this.isTaskExists(task.parent)) {
                    parentTask = _this.getTaskMessage(task.parent);
                  } else {
                    task.parent = 0;
                  }
                  resArr.push({
                    id: item.id,
                    handleType: "UPDATE",
                    taskKey: item.taskKey,
                    parent: item.parent,
                    paramVersion: item.paramVersion,
                    timeVersion: item.timeVersion,
                    parentCode: parentTask ? parentTask.code : 0,
                  });
                  window[`gantt${_this.store}`].updateTask(item.id);
                  if (_this.isTaskExists(task.parent)) {
                    _this.refreshSummaryProgress(
                      window[`gantt${_this.store}`].getParent(item.id),
                      true
                    );
                  }
                }
              });
              window[`gantt${_this.store}`].autoSchedule();
              _this.setState({
                saveData: resArr,
              });
            }
            resolve();
          } else if (resultCode === "NOTICE") {
            if (returnData) {
              // 设置加锁的数据被释放锁
              returnData.forEach((item) => {
                if (_this.isTaskExists(item.id)) {
                  const task = _this.getTaskMessage(item.id);
                  Object.keys(item).map((i) => {
                    task[i] = item[i];
                  });
                  window[`gantt${_this.store}`].updateTask(item.id);
                }
              });
            }
          } else if (resultCode === "SUCCESS") {
            if (requestCode === "LOCK") {
              if (returnData) {
                // 新增的数据需要添加taskKey
                returnData.map((item) => {
                  const task = _this.getTaskMessage(item.id);
                  task.taskKey = item.taskKey;
                  window[`gantt${_this.store}`].updateTask(item.id);
                });
              }
            } else if (requestCode === "EDIT") {
              if (returnData) {
                // 加锁的版本更新
                returnData.map((item) => {
                  const task = _this.getTaskMessage(item.id);
                  if (item.timeVersion) {
                    task.timeVersion = item.timeVersion;
                  }
                  if (item.paramVersion) {
                    task.paramVersion = item.paramVersion;
                  }
                  window[`gantt${_this.store}`].updateTask(item.id);
                });
              }
            }
            resolve();
          } else if (resultCode === "FAIL" || resultCode === "ERROR") {
            if (returnData) {
              returnData.map((item) => {
                const task = _this.getTaskMessage(item.id);
                if (item.lockType === "param") {
                  task.paramLocked = true;
                }
                if (item.lockType === "time") {
                  task.timeLocked = true;
                }
                window[`gantt${_this.store}`].updateTask(item.id);
              });
            }
            reject();
          } else if (resultCode === "EXCEPTION") {
            _this.setState({
              isEdit: true,
              showDefault: false,
            });
          } else if (resultCode === "PROCESS") {
            resolve(returnData);
          }
        }
      };
    });
    return P;
  };
  // 提示信息
  promptInformation = (
    message,
    color = "info",
    duration = 4,
    position = "top"
  ) => {
    Message.destroy();
    Message.create({
      content: message,
      position: position,
      color: color,
      duration: duration,
    });
  };
  // 获取全部数据
  getmostData = (loading = false) => {
    const { parentTaskIds, projectId } = this.state;
    let params = parentTaskIds
      ? { projectId, taskId: parentTaskIds }
      : { projectId };
    return new Promise((resolve, reject) => {
      parentTaskIds;
      Util.getApi(
        "GET",
        "/prjTask/queryByProjectId",
        {
          ...params,
        },
        loading
      )
        .then((res) => {
          const { token, ...moreD } = res;
          moreD.data = moreD.data.map((item) => {
            const newI = { ...item };
            if (item.taskType === "MIESTONE") {
              newI.type = "milestone";
            } else {
              newI.type = "task";
            }
            newI.progress = item.progress / 100;
            return newI;
          });
          window[`gantt${this.store}`].clearAll();
          window[`gantt${this.store}`].parse({ ...moreD });
          this.setState({
            hasLoadingAll: true,
          });
          resolve();
        })
        .catch((e) => {
          reject();
        });
    });
  };
  // 保存
  onSubmit = async (saveData, saveLink) => {
    this.setState({
      showDefault: true,
    });
    const { dirtyData } = this.state;
    progressNumber = 1;
    const newSaveDate = saveData.map((item) => {
      let newI = { ...item };
      dirtyData.forEach((i) => {
        if (item.id == i.id) {
          newI.rdpmPrjRefDataList = i.data.rdpmPrjRefDataList;
          newI.prjOutputList = i.data.prjOutputList;
          newI.prjOutputLinkList = i.data.prjOutputLinkList;
          newI.prjTaskBudgetList = i.data.prjTaskBudgetList;
          newI.prjTaskCheckItemList = i.data.prjTaskCheckItemList;
          newI.prjTaskQualityList = i.data.prjTaskQualityList;
          newI.prjRiskList = i.data.prjRiskList;
          newI.prjTaskDocLinkList = i.data.prjTaskDocLinkList;
          newI.prjTaskDesignDocLinkList = i.data.prjTaskDesignDocLinkList;
          newI.prjTaskTimeList = i.data.prjTaskTimeList;
        }
      });
      return newI;
    });
    // console.log(
    //   JSON.stringify(Util.listToTree(newSaveDate)),
    //   JSON.stringify({
    //     requestCode: "SAVE",
    //     taskNodeArray: this.pakoGzip(newSaveDate),
    //     linkArray: this.pakoGzip(saveLink),
    //   })
    // );
    try {
      window[`${this.store}_ws`].send(
        JSON.stringify({
          requestCode: "SAVE",
          taskNodeArray: this.pakoGzip(newSaveDate),
          linkArray: this.pakoGzip(saveLink),
        })
      );
      const saveResult = await this.getMessage();
      console.log(saveResult);
      if (saveResult) {
        this.processStatus(saveResult, 0);
      } else {
        this.saveSuccess();
      }
    } catch (e) {
      this.setState({
        showDefault: false,
      });
    }
  };
  // 保存进度条情况
  processStatus = (saveResult, time) => {
    this.processTime && clearTimeout(this.processTime);
    this.processTime = null;
    this.processTime = setTimeout(async () => {
      this.processTime && clearTimeout(this.processTime);
      this.processTime = null;
      try {
        const processResult = await Util.getApi(
          "GET",
          "/prjTask/queryAsyncResult",
          {
            sessionId: saveResult.sessionId,
          },
          false
        );
        console.log(processResult);
        const { code, message } = processResult;
        switch (code) {
          case "SUCCESS":
            cb.utils.loadingControl.end();
            this.setState({
              showDefault: true,
            });
            this.saveSuccess();
            break;
          case "FAIL":
            cb.utils.loadingControl.end();
            this.promptInformation(message);
            this.setState({
              showDefault: false,
            });
            break;
          case "PROCESS":
            this.setState(
              {
                showDefault: false,
              },
              () => {
                cb.utils.loadingControl.end();
                cb.utils.loadingControl.start(message);
                this.processStatus(saveResult, 1000);
              }
            );
            break;
          case "ERROR":
            progressNumber = progressNumber + 2;
            if (progressNumber > 5) {
              progressNumber = 1;
              this.setState({
                showDefault: false,
              });
              this.promptInformation(message, "danger");
            } else {
              this.processStatus(saveResult, 1000 * progressNumber);
            }
            break;
          default:
            break;
        }
      } catch (e) {
        cb.utils.loadingControl.end();
        this.promptInformation("请求超时");
        this.setState({
          showDefault: false,
        });
      }
    }, time);
  };
  // 保存成功后的逻辑
  saveSuccess = async () => {
    const { projectId, parentTaskIds, saveData } = this.state;
    let prjTaskParams = parentTaskIds
      ? { projectId: projectId, taskIds: parentTaskIds, fromBag: 1 }
      : { projectId: projectId };
    try {
      const result = await Util.getApi(
        "GET",
        "/prjTask/delayQueryByTaskId",
        {
          ...prjTaskParams,
        },
        false
      );
      this.lockedTaskDataTimer && clearInterval(this.lockedTaskDataTimer);
      const { token, ...more } = result;
      more.data = more.data.map((item) => {
        const newI = { ...item };
        if (item.taskType === "MIESTONE") {
          newI.type = "milestone";
        } else {
          newI.type = "task";
        }
        newI.progress = item.progress / 100;
        return newI;
      });
      window[`${this.store}_ganttWebSocket`] = true;
      const startup = saveData.length > 0 ? true : false;
      window[`${this.store}_ws`].close();
      window[`gantt${this.store}`].clearAll();
      window[`gantt${this.store}`].parse({ ...more });
      window[`gantt${this.store}`].render();
      this.setState({
        saveData: [],
        linkArray: [],
        dirtyData: [],
        oAndCtaskS: true,
        hasLoadingAll: false,
        isEdit: true,
        showDefault: false,
        taskCanStartup: startup,
      });
      this.promptInformation("保存成功");
    } catch (e) {
      this.setState({
        showDefault: false,
      });
    }
  };
  // 发布
  release = (task) => {
    const { pageModel } = this.props;
    const { parentTaskIds } = this.state;
    let needReleaseArr = [];
    if (task.length > 0) {
      needReleaseArr = task;
    } else {
      const ganttAllTask = window[`gantt${this.store}`].getTaskByTime();
      ganttAllTask.forEach((item) => {
        if (!item.publish) {
          needReleaseArr.push(item);
        }
      });
    }
    if (needReleaseArr.length === 0) {
      cb.utils.alert("选择任务不符合发布要求，发布操作失败", "warning");
      return;
    }
    let jumpParams = parentTaskIds
      ? {
          bizName: "项目任务",
          wfState: 0,
          metaFullName: "plm-rdpm.prjTask.prjTask",
          metaBillNo: "rdpmPrjGanttModal",
          wfKey: "projectTask",
          url: "imp/plm/rdpm/life/jump",
          toCode: "EditingToDistribution",
          businessData: needReleaseArr,
        }
      : {
          bizName: "项目",
          wfState: 0,
          metaFullName: "plm-rdpm.project.project",
          metaBillNo: "rdpmPrjList",
          wfKey: "project",
          url: "imp/plm/rdpm/life/jump",
          toCode: "EditingToDistribution",
          businessData: needReleaseArr,
        };
    const getAllData = pageModel.getAllData();
    pageModel.communication({
      type: "modal",
      payload: {
        key: "LifeJump",
        data: {
          vm: pageModel,
          common: common,
          tplKey: "lifecycleUseId",
          attrKey: "lifecycleAttrId",
          rows: [getAllData],
          jumpParams: jumpParams,
          ok: (rows, res) => {
            if (rows.length != res.sucessCount) {
              res.sucessCount = res.count - res.failCount;
              res.messages = res.messages || [];
              cb.utils.alert(res.messages, "error");
            }
            pageModel.biz.do("refresh", pageModel);
          },
        },
      },
    });
  };
  // 协同编制
  synergyToCompile = (id) => {
    const { pageModel } = this.props;
    cb.utils.confirm({
      title: "您确认要发起协同编制邀请？",
      onOk: async () => {
        const selectTaskData = id
          ? [id]
          : window[`gantt${this.store}`].getSelectedTasks();
        let compileData = selectTaskData.filter((i) => {
          const task = this.getTaskMessage(i);
          return !task.publish;
        });
        if (compileData.length === 0) {
          cb.utils.alert("选择任务不符合发布要求，协同编制操作失败", "warning");
          return;
        }
        const params = {
          billnum: pageModel.getParams()["billNo"],
          data: {
            taskIds: compileData.join(),
          },
        };
        try {
          await Util.getApi("GET", "/prjTask/delayQueryByTaskId", {
            ...params,
          });
        } catch (e) {}
      },
    });
  };
  render() {
    const {
      ganttNeedData,
      criticalPathS,
      toggleModeStatus,
      linksStatus,
      oAndCtaskS,
      isEdit,
      showDefault,
      saveData,
      saveLink,
      searchOpenTask,
      relinkData,
      projectId,
      parentTaskIds,
      formGanttStatus,
      hasLoadingAll,
      searchValue,
      taskCanStartup,
    } = this.state;
    const { pageModel } = this.props;
    const getAllData = pageModel.getAllData();
    window[`gantt${this.store}`]
      ? (window[
          `gantt${this.store}`
        ].config.highlight_critical_path = criticalPathS)
      : null;
    window[`gantt${this.store}`]
      ? (window[`gantt${this.store}`].config.show_links = !linksStatus)
      : null;
    window[`gantt${this.store}`]
      ? (window[`gantt${this.store}`].config.readonly = isEdit)
      : null;
    let releaseDisabled = true;
    if (parentTaskIds) {
      releaseDisabled = !taskCanStartup;
    } else {
      if (getAllData.lifecycleAttrpoolId == 2203692487414016) {
        releaseDisabled = false;
      }
    }
    // 生命周期状态: lifecycleAttrId_name 审批状态：wfstate
    let lifecycleAttrIdStatus =
      getAllData.lifecycleAttrId_name === "已完成" ||
      getAllData.lifecycleAttrId_name === "已中止" ||
      getAllData.lifecycleAttrId_name === "已暂停" ||
      getAllData.wfstate === 1;
    return (
      <div id={`${this.store}-gantt-Fullscreen`} className="gantt-Fullscreen">
        {!Util.isEmptyObj(ganttNeedData) ? (
          <div>
            <div className="btn-grounp">
              <div className="search-content">
                <Loading fullScreen showBackDrop={true} show={showDefault} />
                <FormControl
                  className="demo5-input"
                  value={searchValue}
                  onSearch={this.onSearch}
                  onChange={this.onChange}
                  type="search"
                />
              </div>
              <div
                style={{
                  display: "flex",
                }}
              >
                <Button >日历更改</Button>
                {/* <Button
                  bordered
                  onClick={this.release}
                  disabled={releaseDisabled || !isEdit}
                >
                  发布
                </Button>
                <Button
                  bordered
                  onClick={this.synergyToCompile}
                  disabled={!isEdit}
                >
                  协同编制
                </Button> */}
                <Button
                  bordered
                  onClick={() => {
                    this.setState(
                      {
                        criticalPathS: !criticalPathS,
                      },
                      () => {
                        window[`gantt${this.store}`].render();
                      }
                    );
                  }}
                >
                  {criticalPathS ? "关闭关键路径" : "开启关键路径"}
                </Button>
                <Select
                  defaultValue="day"
                  style={{ width: 50, marginRight: 15, marginLeft: 5 }}
                  onChange={(e) => this.setLevel(e)}
                >
                  <Option value="year">年</Option>
                  <Option value="month">月</Option>
                  <Option value="week">周</Option>
                  <Option value="day">日</Option>
                  <Option value="hour">时</Option>
                  <Option value="minute">分</Option>
                </Select>
                <Select
                  defaultValue="now"
                  style={{ width: 114 }}
                  onChange={(e) => this.gotoTime(e)}
                >
                  <Option value="start">任务开始时间</Option>
                  <Option value="now">当前时间</Option>
                  <Option value="end">任务结束时间</Option>
                </Select>
                <Button
                  bordered
                  onClick={async () => {
                    if (oAndCtaskS && !hasLoadingAll) {
                      try {
                        await this.getmostData(true);
                      } catch (e) {
                        this.setState({
                          showDefault: false,
                        });
                      }
                    }
                    this.oAndCtask();
                  }}
                >
                  {oAndCtaskS ? "展开所有分支" : "折叠所有分支"}
                </Button>
                <Button
                  bordered
                  onClick={() => this.toggleMode(toggleModeStatus)}
                >
                  全局可视化
                </Button>
                <Button
                  bordered
                  onClick={() => {
                    this.setState(
                      {
                        linksStatus: !linksStatus,
                      },
                      () => {
                        window[`gantt${this.store}`].render();
                      }
                    );
                  }}
                >
                  {linksStatus ? "显示约束线" : "隐藏约束线"}
                </Button>
                <Button bordered onClick={() => this.exportExcel()}>
                  导出
                </Button>
                {lifecycleAttrIdStatus ? null : (
                  <>
                    <Button
                      disabled={!isEdit || formGanttStatus}
                      bordered
                      onClick={async () => {
                        window[`${this.store}_ganttWebSocket`] = false;
                        this.setState({
                          showDefault: true,
                        });
                        if (!hasLoadingAll) {
                          try {
                            await this.getmostData();
                          } catch (e) {
                            this.setState({
                              showDefault: false,
                            });
                          }
                        }
                        this.getwebsocket();
                      }}
                    >
                      WBS编辑
                    </Button>

                    <Button
                      disabled={isEdit || formGanttStatus}
                      bordered
                      onClick={() => {
                        console.log(saveData, saveLink);
                        this.onSubmit(saveData, saveLink);
                      }}
                    >
                      WBS保存
                    </Button>
                    <Button
                      disabled={isEdit || formGanttStatus}
                      bordered
                      onClick={() => {
                        this.setState({
                          isEdit: true,
                        });
                        window[`${this.store}_ganttWebSocket`] = true;
                        window[`${this.store}_ws`].close();
                        window[`gantt${this.store}`].render();
                        this.lockedTaskDataTimer &&
                          clearInterval(this.lockedTaskDataTimer);
                      }}
                    >
                      退出
                    </Button>
                  </>
                )}

                {/* <Button
            onClick={() => {
              window[`gantt${this.store}`].ext.fullscreen.toggle();
            }}
          >
            全屏
          </Button> */}
              </div>
            </div>
            <GanttPage
              ganttInstance={window[`gantt${this.store}`]}
              data={ganttNeedData}
              addEvent={this.initGantt}
              searchOpenTask={searchOpenTask}
              relinkData={relinkData}
              openTaskToSave={this.openTaskToSave}
              projectId={projectId}
              parentTaskIds={parentTaskIds}
              getTaskParentData={this.getTaskParentData}
            />
          </div>
        ) : null}
      </div>
    );
  }
}

export default GanttView;
