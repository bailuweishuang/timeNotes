import React from "react";
import Util from "./util";
import Message from "bee-message";
import "bee-message/build/Message.css";
const { getPrjCalendarData } = require("../calendar/calendarService");
const { convertWorkingTime } = require("../calendar/calendarUtils");

class GanttPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchOpen: this.props.searchOpenTask,
    };
  }
  componentDidMount() {
    const { ganttInstance } = this.props;
    this.zoomConfig = {
      levels: [
        {
          name: "minute",
          scale_height: 50,
          min_column_width: 120,
          scales: [
            { unit: "day", step: 1, format: "%F %d" },
            { unit: "hour", step: 1, format: "%H:%i" },
            { unit: "minute", step: 30, format: "%i" },
          ],
        },
        {
          name: "hour",
          scale_height: 50,
          min_column_width: 120,
          scales: [
            { unit: "day", format: "%F %d" },
            { unit: "hour", step: 1, format: "%H:%i" },
          ],
        },
        {
          name: "day",
          scale_height: 50,
          min_column_width: 120,
          scales: [
            { unit: "year", step: 1, format: "%Y" },
            { unit: "month", step: 1, format: "%F" },
            { unit: "day", format: "%d" },
          ],
        },
        {
          name: "week",
          scale_height: 50,
          min_column_width: 50,
          scales: [
            { unit: "year", step: 1, format: "%Y" },
            {
              unit: "week",
              step: 1,
              format: function (date) {
                const dateToStr = ganttInstance.date.date_to_str("%n/%d");
                const endDate = ganttInstance.date.add(date, -6, "day");
                return `${dateToStr(endDate)} - ${dateToStr(date)}`;
              },
            },
            { unit: "day", step: 1, format: "%j %D" },
          ],
        },
        {
          name: "month",
          scale_height: 50,
          min_column_width: 120,
          scales: [
            { unit: "year", step: 1, format: "%Y" },
            { unit: "month", step: 1, format: "%F" },
          ],
        },
        {
          name: "year",
          scale_height: 50,
          min_column_width: 30,
          scales: [{ unit: "year", step: 1, format: "%Y" }],
        },
      ],
    };
    this.initGantt();
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.searchOpenTask !== this.props.searchOpenTask) {
      this.setState({
        searchOpen: nextProps.searchOpenTask,
      });
    }
  }
  // 初始化甘特图
  initGantt = () => {
    const { ganttInstance, data, addEvent, projectId } = this.props;
    const _this = this;
    ganttInstance.plugins({
      // 自动排期
      auto_scheduling: true,
      // 关键路径
      critical_path: true,
      // 标识
      marker: true,
      // 开启全屏
      fullscreen: true,
      // 回退
      undo: true,
      //多选
      // multiselect: true,
    });
    ganttInstance.config.types["meeting"] = "meeting";
    ganttInstance.locale.labels["type_meeting"] = "Meeting";
    // 语言
    ganttInstance.i18n.setLocale("cn");
    // 定义行高
    ganttInstance.config.row_height = 30;
    // 自动排程
    ganttInstance.config.auto_scheduling = true;
    // 定义甘特图是否会在数据加载/解析时进行自动调度
    // ganttInstance.config.auto_scheduling_initial = true;
    // 启用自动计划模式，在该模式下，任务将始终重新计划为最早的日期
    // ganttInstance.config.auto_scheduling_strict = true;
    ganttInstance.config.auto_scheduling_compatibility = true;
    // 自动将具有子任务的任务转换为项目，将没有子任务的项目转换回任务
    ganttInstance.config.auto_types = true;
    // 启用计算工作时间而不是日历时间的持续时间
    ganttInstance.config.work_time = true;
    // 可以将任务的开始日期和结束日期调整为工作时间（拖动时
    ganttInstance.config.correct_work_time = true;
    // 自动扩展时间范围，以适应所有显示的任务
    ganttInstance.config.fit_tasks = true;
    // 日历对接
    getPrjCalendarData(projectId, (data) => {
      if (data.workWeek) {
        //工作日
        let arrWorkingDay = data.workWeek.split("");
        //工作时间段
        let arrTime = convertWorkingTime(data.prjWorkTimeList);
        let timeArray = [];
        arrTime.forEach((item, index) => {
          if (index % 2 > 0) {
            let s = `${arrTime[index - 1].time}-${item.time}`;
            timeArray.push(s);
          }
        });
        arrWorkingDay.forEach((item, index) => {
          ganttInstance.setWorkTime({
            day: index,
            hours: item === "0" ? false : true,
          });
        });
        ganttInstance.setWorkTime({ hours: timeArray });
        if (data.prjRestDayList) {
          data.prjRestDayList.map((item) => {
            ganttInstance.setWorkTime({
              date: new Date(item.date),
              hours: item.working,
            });
          });
        }
        ganttInstance.render();
      }
    });

    // 设置初始化时间视图
    ganttInstance.ext.zoom.init(this.zoomConfig);
    ganttInstance.ext.zoom.setLevel("day");
    // 列表背景色
    ganttInstance.templates.grid_row_class = function (
      _start_date,
      _end_date,
      item
    ) {
      if (item.progress == 0) return "green-sex";
      if (item.progress >= 1) return "orange-sex";
    };
    ganttInstance.templates.task_row_class = function (
      _start_date,
      _end_date,
      item
    ) {
      if (item.progress == 0) return "green-sex";
      if (item.progress >= 1) return "orange-sex";
    };
    //右边条状图的颜色
    ganttInstance.templates.task_class = function (start, end, task) {
      // if (_this.state.autoScheduleChangeData.includes(task.id)) {
      //   return "autoScheduleChangeData";
      // }
      const { parentTaskIds } = _this.props;
      let length = ganttInstance.getChildren(task.id).length;
      let className;
      if (length > 0 || !task.classifyCode) {
        className = "hide_project_progress_drag";
        if (
          (parentTaskIds && task.parent === 0) ||
          task.classifyCode === "PROGRESS" ||
          task.classifyCode === "WAITING"
        ) {
          className = `${className} gantt_dependent_task`;
        }
      }
      return className;
    };
    // 左边内容
    ganttInstance.templates.leftside_text = function (start, end, task) {
      if (task.paramLocked && task.timeLocked) {
        return `<div class="suo-content"><div class="time_suo"><span class="suo p-suo"></span><div class="left_side_suo_tip">${task.paramLocker}</div></div>
        <div class="time_suo"><span class="suo t-suo"></span><div class="left_side_suo_tip">${task.timeLocker}</div></div></div>`;
      }
      if (task.paramLocked || task.timeLocked) {
        return `<div class="suo-content one-suo"><div class="time_suo"><span class="suo ${
          task.paramLocked ? "p-suo" : "t-suo"
        }  "></span><div class="left_side_suo_tip">${
          task.paramLocker || task.timeLocker
        }</div></div></div>`;
      }
      // if (task.timeLocked) {
      //   return `<div class="suo-content one-suo"><div class="time_suo"><span class="suo t-suo"></span><div class="left_side_suo_tip">${task.timeLocker}</div></div></div>`;
      // }
    };
    // 里程碑
    ganttInstance.templates.rightside_text = function (_start, _end, task) {
      if (task.type == ganttInstance.config.types.milestone) {
        return task.text;
      }
      return "";
    };
    // ganttInstance.config.keep_grid_width = true;
    // 设置layout
    ganttInstance.config.layout = {
      css: "gantt_container",
      cols: [
        {
          width: 400,
          min_width: 300,
          rows: [
            {
              view: "grid",
              scrollX: "gridScroll",
              scrollable: true,
              scrollY: "scrollVer",
            },
            { view: "scrollbar", id: "gridScroll", group: "horizontal" },
          ],
        },
        { resizer: true, width: 1 },
        {
          rows: [
            { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
            { view: "scrollbar", id: "scrollHor", group: "horizontal" },
          ],
        },
        { view: "scrollbar", id: "scrollVer" },
      ],
    };
    // 设置进度栏中的文字
    ganttInstance.templates.progress_text = function (_start, _end, task) {
      let res =
        !task.classifyCode || task.classifyCode === "EDITING"
          ? null
          : "<span style='text-align:left;'>" +
            Math.round(task.progress * 100) +
            "% </span>";
      return res;
    };
    // 设置工作日跳过和样式
    ganttInstance.templates.scale_cell_class = function (date) {
      if (!ganttInstance.isWorkTime(date)) return "weekend";
    };
    ganttInstance.templates.timeline_cell_class = function (_item, date) {
      if (!ganttInstance.isWorkTime(date)) return "weekend";
    };
    // 突出显示拖动是的任务位置
    ganttInstance.config.show_drag_vertical = true;
    ganttInstance.config.show_drag_dates = true;
    ganttInstance.config.drag_label_width = 70;
    ganttInstance.config.drag_date = "%Y‐%m‐%d";
    ganttInstance.templates.drag_date = null;
    ganttInstance.attachEvent("onGanttReady", function () {
      ganttInstance.templates.drag_date = ganttInstance.date.date_to_str(
        ganttInstance.config.drag_date
      );

      //highlight area
      ganttInstance.addTaskLayer({
        renderer: function highlight_area(task) {
          var sizes = ganttInstance.getTaskPosition(
              task,
              task.start_date,
              task.end_date
            ),
            wrapper = document.createElement("div");

          addElement({
            css: "drag_move_vertical",
            left: sizes.left + "px",
            top: 0,
            width: sizes.width + "px",
            height:
              ganttInstance.getVisibleTaskCount() *
                ganttInstance.config.row_height +
              "px",
            wrapper: wrapper,
          });

          addElement({
            css: "drag_move_horizontal",
            left: 0,
            top: sizes.top + "px",
            width: 100 + "%",
            height: ganttInstance.config.row_height - 1 + "px",
            wrapper: wrapper,
          });

          return wrapper;
        },
        filter: function (task) {
          return (
            ganttInstance.config.show_drag_vertical &&
            task.id == ganttInstance.getState().drag_id
          );
        },
      });

      //show drag dates
      ganttInstance.addTaskLayer({
        renderer: function show_dates(task) {
          var sizes = ganttInstance.getTaskPosition(
              task,
              task.start_date,
              task.end_date
            ),
            wrapper = document.createElement("div");

          addElement({
            css: "drag_move_start drag_date",
            left:
              sizes.left - ganttInstance.config.drag_label_width - 28 + "px",
            top: sizes.top + "px",
            width: ganttInstance.config.drag_label_width + "px",
            height: ganttInstance.config.row_height - 1 + "px",
            html: ganttInstance.date.date_to_str("%Y-%m-%d %H:%i")(
              task.start_date
            ),
            wrapper: wrapper,
          });

          addElement({
            css: "drag_move_end drag_date",
            left: sizes.left + sizes.width + 4 + "px",
            top: sizes.top + "px",
            width: ganttInstance.config.drag_label_width + "px",
            height: ganttInstance.config.row_height - 1 + "px",
            html: ganttInstance.date.date_to_str("%Y-%m-%d %H:%i")(
              task.end_date
            ),
            wrapper: wrapper,
          });
          return wrapper;
        },
        filter: function (task) {
          return (
            ganttInstance.config.show_drag_dates &&
            task.id == ganttInstance.getState().drag_id
          );
        },
      });

      function addElement(config) {
        var div = document.createElement("div");
        div.style.position = "absolute";
        div.className = config.css || "";
        div.style.left = config.left;
        div.style.width = config.width;
        div.style.height = config.height;
        div.style.lineHeight = config.height;
        div.style.top = config.top;
        if (config.html) div.innerHTML = config.html;
        if (config.wrapper) config.wrapper.appendChild(div);
        return div;
      }
    });
    // 添加链接之前
    ganttInstance.attachEvent("onBeforeLinkAdd", function (id, link) {
      const sourceTask = ganttInstance.getTask(link.source);
      const targetTask = ganttInstance.getTask(link.target);
      if (sourceTask.timeLocked || targetTask.timeLocked) {
        Message.destroy();
        Message.create({
          content: "其他用户-正在编辑相关数据，请稍后尝试。",
          color: "danger",
        });
        return false;
      }
      if (
        sourceTask.classifyCode !== "EDITING" ||
        targetTask.classifyCode !== "EDITING"
      ) {
        Message.destroy();
        Message.create({
          content: "相关任务不允许修改。",
          color: "danger",
        });
        return false;
      }
    });
    // 阻止默认弹窗
    ganttInstance.attachEvent("onBeforeLightbox", function () {
      return false;
    });
    // 打开分支
    ganttInstance.attachEvent("onTaskOpened", async function (id) {
      const { searchOpen } = _this.state;
      const { relinkData, openTaskToSave, projectId } = _this.props;
      const taskIds = ganttInstance.getChildren(id);
      const openedTask = ganttInstance.getTask(id);
      let childId = [];
      let hasChild = false;
      if (taskIds.length > 0) {
        taskIds.forEach((i) => {
          const task = ganttInstance.getTask(i);
          if (task.$has_child) {
            hasChild = true;
          }
          childId.push(...ganttInstance.getChildren(i));
        });
      } else {
        if (openedTask.$has_child) {
          hasChild = true;
        }
      }
      const loading = taskIds.length > 0 ? false : true;
      if (!searchOpen && hasChild && childId.length === 0) {
        const result = await Util.getApi(
          "GET",
          "/prjTask/delayQueryByTaskId",
          {
            projectId: projectId,
            taskIds: taskIds.length > 0 ? taskIds.join() : id,
          },
          loading
        );
        const { data } = result;
        let reData = [];
        const parseData = data.map((item) => {
          let newItm = { ...item };
          if (item.taskType === "MIESTONE") {
            newItm.type = "milestone";
          } else {
            newItm.type = "task";
          }
          newItm.progress = item.progress / 100;
          relinkData.map((i) => {
            if (item.id === i.id) {
              Object.keys(i).map((k) => {
                newItm[k] = i[k];
              });
              reData.push({
                id: i.id,
                handleType: "UPDATE",
                taskKey: i.taskKey,
                paramVersion: i.paramVersion,
                timeVersion: i.timeVersion,
              });
            }
          });
          return newItm;
        });
        if (openTaskToSave) {
          openTaskToSave(reData);
        }
        ganttInstance.parse({ data: parseData });
      }
    });
    // 拖动前被加锁
    ganttInstance.attachEvent("onBeforeTaskDrag", function (id, mode, e) {
      const task = ganttInstance.getTask(id);
      const { parentTaskIds, getTaskParentData } = _this.props;
      if (task.parent === 0 && parentTaskIds) {
        if (mode === "progress") {
          if (ganttInstance.getChildren(id).length === 0) {
            return true;
          }
        }
        return false;
      }
      if (task.classifyCode !== "EDITING") {
        Message.destroy();
        Message.create({
          content: "此任务不允许修改。",
          color: "danger",
        });
        return false;
      }
      if (!task.classifyCode) {
        if (mode === "progress") {
          return false;
        }
      }
      if (task.paramLocked && task.timeLocked) {
        Message.destroy();
        Message.create({
          content: "其他用户-正在编辑相关数据，请稍后尝试。",
          color: "danger",
        });
        return false;
      }
      if (task.paramLocked && mode === "progress") {
        Message.destroy();
        Message.create({
          content: "其他用户-正在编辑相关数据，请稍后尝试。",
          color: "danger",
        });
        return false;
      }
      if (task.timeLocked && (mode === "move" || mode === "resize")) {
        Message.destroy();
        Message.create({
          content: "其他用户-正在编辑相关数据，请稍后尝试。",
          color: "danger",
        });
        return false;
      }
      getTaskParentData(null);
      return true;
    });
    // 懒加载由于子元素没有加载不显示出来更改属性
    ganttInstance.attachEvent("onTaskLoading", function (task) {
      if (ganttInstance.getChildren(task.id).length === 0 && task.$has_child) {
        task.$has_child = false;
        task.shouldChangeChild = true;
      }
      return true;
    });
    // 加载数据了更改回原属性
    ganttInstance.attachEvent("onBeforeGanttRender", function () {
      const { parentTaskIds } = _this.props;
      ganttInstance.eachTask(function (task) {
        // 测试执行中
        if (
          (task.parent == 0 && parentTaskIds) ||
          task.classifyCode === "PROGRESS" ||
          task.classifyCode === "WAITING"
        ) {
          task.type = ganttInstance.config.types.meeting;
          ganttInstance.refreshTask(task.id);
        } else if (task.shouldChangeChild) {
          task.$has_child = true;
          ganttInstance.refreshTask(task.id);
        }
      });
    });
    // gantt attachEvent事件
    addEvent();
    // 初始化甘特图
    ganttInstance.init(this.ganttRef);
    ganttInstance.parse(data);
  };

  render() {
    return (
      <div
        ref={(ref) => (this.ganttRef = ref)}
        className={
          this.props.parentTaskIds
            ? "ganttref-modal ganttref"
            : "ganttref ganttref-projiect"
        }
      ></div>
    );
  }
}

export default GanttPage;
