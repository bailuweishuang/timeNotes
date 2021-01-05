import React, { Component } from "react";
import { Page, pdfjs } from "react-pdf";
import { Document } from "react-pdf/dist/esm/entry.webpack";
import { Pagination, Icon } from "antd-mobile";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
import "./index.less";
class FilePreview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pageNumber: 1, // pdf当前页
      numPages: 0,
      scale: 2,
      startDistance: 0,
      imgScale: 1,
      origin: {},
    };
  }

  componentDidMount() {
    const pdf = document.getElementById("searchPdf");
    const imageId = document.getElementById("searchId");
    if (pdf) {
        // 移动端添加触摸事件
      pdf.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) {
          let start = this.getDistance(
            {
              x: e.touches[0].pageX,
              y: e.touches[0].pageY,
            },
            {
              x: e.touches[1].pageX,
              y: e.touches[1].pageY,
            }
          );
          this.setState({
            startDistance: start,
          });
        }
      });
      // 移动端添加移动事件
      pdf.addEventListener("touchmove", (e) => {
        if (
          e.touches.length === 2 &&
          this.state.scale <= 5 &&
          this.state.scale >= 2
        ) {
          let end = this.getDistance(
            {
              x: e.touches[0].pageX,
              y: e.touches[0].pageY,
            },
            {
              x: e.touches[1].pageX,
              y: e.touches[1].pageY,
            }
          );
          if (end - this.state.startDistance > 0) {
            this.setState({
              scale: this.state.scale + 1,
            });
          } else {
            let numeber = this.state.scale === 2 ? 2 : this.state.scale - 1;
            this.setState({
              scale: numeber,
            });
          }
        }
      });
    }
    if (imageId) {
      imageId.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) {
          let start = this.getDistance(
            {
              x: e.touches[0].pageX,
              y: e.touches[0].pageY,
            },
            {
              x: e.touches[1].pageX,
              y: e.touches[1].pageY,
            }
          );
          this.setState({
            startDistance: start,
          });
        }
      });
      imageId.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2) {
          let end = this.getDistance(
            {
              x: e.touches[0].pageX,
              y: e.touches[0].pageY,
            },
            {
              x: e.touches[1].pageX,
              y: e.touches[1].pageY,
            }
          );
          let scal = (end / this.state.startDistance).toFixed(2);
          let origin = this.getOrigin(
            {
              x: e.touches[0].pageX,
              y: e.touches[0].pageY,
            },
            {
              x: e.touches[1].pageX,
              y: e.touches[1].pageY,
            }
          );
          this.setState({
            imgScale: scal,
            origin,
          });
        }
      });
    }
  }
  shouldComponentUpdate(newProps, newState) {
    if (
      this.state.numPages !== newState.numPages ||
      this.state.pageNumber !== newState.pageNumber ||
      this.state.scale !== newState.scale ||
      this.state.imgScale !== newState.imgScale
    ) {
      return true;
    }
    return false;
  }

  componentWillUnmount() {
    const pdf = document.getElementById("searchPdf");
    if (pdf) {
      pdf.removeEventListener("touchstart", undefined);
      pdf.removeEventListener("touchmove", undefined);
    }
    const imageId = document.getElementById("searchId");
    if (imageId) {
      imageId.removeEventListener("touchstart", undefined);
      imageId.removeEventListener("touchmove", undefined);
    }
  }

  // 获取两个手指之间的距离
  getDistance = (start, stop) => {
    return Math.sqrt(
      Math.pow(stop.x - start.x, 2) + Math.pow(stop.y - start.y, 2)
    );
  };

  // 获取两个手指之间的圆点
  getOrigin = (first, second) => {
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
  };
  
  // pdf接口成功的回调
  onDocumentLoadSuccess = ({ numPages }) => {
    this.setState({
      numPages: numPages,
    });
  };

  // 页面改变事件回调
  onChange = (e) => {
    this.setState({
      pageNumber: e,
      scale: 2,
    });
  };

  // 关闭
  onCancel = () => {
    const { onCancel } = this.props;
    onCancel();
  };
  render() {
    const { pageNumber, numPages, scale, imgScale, origin } = this.state;
    const { pdfId, imgUrl, type } = this.props;
    let storageUser = localStorage.userInfo;
    let userInfo = (storageUser && JSON.parse(storageUser)) || {};
    let storageTenant = localStorage.tenant || "";
    let tenant = (storageTenant && JSON.parse(storageTenant)) || {};
    let storageWbat = localStorage.wbat;
    let tenantId = (tenant && tenant.tenantId) || "";
    // let url = `http://10.115.0.226:9090/app/view?fileId=${pdfId}`;
    return (
      <div className="pdf-preview">
        <div className="cancel" onClick={this.onCancel}>
          关闭
        </div>
        {type === "img" ? (
          <div className="img">
            <img
              src={imgUrl}
              id="searchId"
              style={{
                transform: `scale(${imgScale})`,
                transformOrigin: `${origin.x}px ${origin.y}px`,
              }}
            />
          </div>
        ) : (
          <div className="pdf" id="searchPdf">
            <Document
              className="pdf"
              file={{
                url: pdfId,
                httpHeaders: {
                  tenantId: tenantId,
                  wb_at: storageWbat,
                  accessToken:
                    (userInfo &&
                      userInfo.token &&
                      userInfo.token.accessToken) ||
                    "",
                  isAjax: 1,
                  userSource: "imp-mobile",
                  // userSource: "imp-mobile",
                  // tenantId: "p96t7yt0",
                  // wb_at: "4cf475ca-833c-4f49-aefb-ed32a3d52a93",
                  // accessToken:
                  //   "bttRWF2YnBuWXM4S3d6ZmpYZFB3WTZzUDUxVUpselRtV2dzOGxuWmFXRXEyS1JTWm5RckRTZ0I2bjVDaDQxSXFBMFJxeHMzSDJjdDhKZmtGL21xN2hWUld5SytZcnk2RG1JZ2tCTndJM2ZieE09X195b25iaXBpbXAueXl1YXAuY29t__9ffbfe49302056629fc3d560a2233fbf_1609139980331",
                  // isAjax: 1,
                },
                xhrFields: {
                  withCredentials: true,
                },
              }}
              loading={
                <div style={{ textAlign: "center", marginTop: 100 }}>
                  loading...
                </div>
              }
              error="error"
              onLoadSuccess={this.onDocumentLoadSuccess}
              renderMode={"canvas"}
              noData={
                <div
                  style={{ float: "left", marginLeft: "50%", marginTop: "10%" }}
                >
                  暂无数据
                </div>
              }
            >
                {/* width最好写上，不然手机上pdf会不显示出来 */}
              <Page pageNumber={pageNumber} scale={scale} width={300} />
            </Document>
            <Pagination
              total={numPages}
              className="custom-pagination-with-icon"
              current={pageNumber}
              onChange={this.onChange}
              locale={{
                prevText: (
                  <span className="arrow-align">
                    <Icon type="left" />
                    上一页
                  </span>
                ),
                nextText: (
                  <span className="arrow-align">
                    下一页
                    <Icon type="right" />
                  </span>
                ),
              }}
            />
          </div>
        )}
      </div>
    );
  }
}

export default FilePreview;
