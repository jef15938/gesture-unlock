import {
  AfterViewInit,
  Component,
  ElementRef,
  Renderer2,
  ViewChild
} from '@angular/core';


interface Point {
  x: number;
  y: number;
  index ? : number;
}

export class GestureLockObj {
  password!: string;
  chooseType: number;
  step: number;

  constructor() {
    this.chooseType = 3;
    this.step = 0;
  }
}

export class GestureAttemptObj {
  lockDate!: number;
  lastAttemptDate!: number;
  attemptsNu: number;

  constructor() {
    this.attemptsNu = 3;
  }

}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  isLogin: boolean = false;
  height = 320;
  width = 320;
  chooseType = 3;
  devicePixelRatio: any; // 設置密碼
  titleMes = "手勢密碼解鎖";
  unSelectedColor = '#87888a';
  selectedColor = '#1783CE';
  successColor = '#7bd56c';
  errorColor = '#d54e20';
  lockTimeUnit = 10; //嘗試失敗後鎖定多少秒
  gestureLockObj: GestureLockObj = new GestureLockObj(); //密碼本地緩存
  gestureAttemptObj: GestureAttemptObj = new GestureAttemptObj(); //嘗試日期和次數本地緩存

  firstPassword!: string;
  private canTouch = false;
  private radius!: number; //小圓點半徑

  private allPointArray: Point[] = [];
  private unSelectedPointArray: Point[] = [];
  private selectedPointArray: Point[] = [];
  private ctx: any;

  private lockTime = this.lockTimeUnit;

  @ViewChild('canvas') canvas!: ElementRef;
  textColor = this.selectedColor;

  constructor(
    private render: Renderer2
  ) {}
  ngAfterViewInit() {
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.radius = this.width * this.devicePixelRatio / (1 + 2 * this.chooseType) / 2; // 半径计算
    this.canvas.nativeElement.height = this.height * this.devicePixelRatio;
    this.canvas.nativeElement.width = this.width * this.devicePixelRatio;
    this.ctx = this.canvas.nativeElement.getContext('2d');

    this.initPointArray();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawCircles(this.allPointArray);
    this.bindEvent();


    const gestureLockObj = window.localStorage.getItem('gestureLockObj');
    if (gestureLockObj) {
      this.gestureLockObj = JSON.parse(gestureLockObj);
    }

    const gestureAttemptObj = window.localStorage.getItem('gestureAttemptObj');

    if (gestureAttemptObj) {
      this.gestureAttemptObj = JSON.parse(gestureAttemptObj);

      if (this.gestureAttemptObj.attemptsNu === 0) {
        const now = Date.now();
        const last = this.gestureAttemptObj.lockDate;
        const secend = (now - last) / 1000 - this.lockTimeUnit;
        if (secend <= 0) {
          this.setInteralFun(1 - secend);
        } else {
          this.gestureAttemptObj = new GestureAttemptObj();
          window.localStorage.setItem("gestureAttemptObj", JSON.stringify(this.gestureAttemptObj));
        }
      }
    }


    if (this.gestureLockObj.step === 0) {
      this.titleMes = "請繪製你的手勢密碼";
    }
  }

  //滑動結束後處理密碼
  private dealPassword(selectedArray: any) {
    if (this.gestureLockObj.step === 2) {
      /** 進入解鎖 **/
      if (this.checkPassword(selectedArray, this.gestureLockObj.password)) { // 解锁成功
        this.textColor = this.successColor;
        this.titleMes = '解鎖成功';
        this.drawAll(this.successColor);
        window.localStorage.removeItem('gestureAttemptObj');
        setTimeout(()=> {
          this.isLogin = true;
        }, 1000)
      } else { //解鎖失败
        this.lockFail();
      }
    } else if (this.gestureLockObj.step === 1) { // 設置密碼確認密碼
      if (this.checkPassword(selectedArray, this.firstPassword)) { //設置密碼成功
        this.gestureLockObj.step = 2;
        this.gestureLockObj.password = this.firstPassword;
        this.titleMes = '手勢密碼設置成功，再次繪製登入';

        window.localStorage.setItem('gestureLockObj', JSON.stringify(this.gestureLockObj));
        this.drawAll(this.successColor);

      } else { //設置密碼失败
        this.textColor = this.errorColor;
        this.titleMes = '兩次不一致，重新輸入';
        this.drawAll(this.errorColor);
        this.gestureLockObj = new GestureLockObj();
      }
    } else if (this.gestureLockObj.step === 0) { //設置密码
      this.gestureLockObj.step = 1;
      this.firstPassword = this.parsePassword(selectedArray);
      this.textColor = this.selectedColor;
      this.titleMes = '再次输入';
    } else if (this.gestureLockObj.step === 3) { //重置密碼输入舊密碼
      if (this.checkPassword(selectedArray, this.gestureLockObj.password)) { // 舊密碼成功
        this.gestureLockObj.step = 0;
        this.textColor = this.successColor;
        this.titleMes = '請输入新手勢密碼';
        this.drawAll(this.successColor);
      } else { //舊密碼失敗
        this.lockFail();
      }
    }
  }

  //解锁失败
  lockFail() {
    this.drawAll(this.errorColor);
    this.textColor = this.errorColor;
    this.gestureAttemptObj.attemptsNu = this.gestureAttemptObj.attemptsNu - 1;
    if (this.gestureAttemptObj.attemptsNu > 0) {
      this.titleMes = `密碼錯誤，您還可以输入${this.gestureAttemptObj.attemptsNu}次`;
    } else {
      this.gestureAttemptObj.lockDate = Date.now();
      window.localStorage.setItem("gestureAttemptObj", JSON.stringify(this.gestureAttemptObj));
      this.setInteralFun(this.lockTimeUnit);
    }
  }

  setInteralFun(time: any) { //檢查是否超過設定時間
    this.lockTime = time;
    const interval = setInterval(() => {
      this.lockTime = this.lockTime - 1;
      this.titleMes = `請在${this.lockTime}秒後嘗試`;
      if (this.lockTime === 0) {
        this.gestureAttemptObj = new GestureAttemptObj();
        window.localStorage.setItem("gestureAttemptObj", JSON.stringify(this.gestureAttemptObj));

        this.lockTime = this.lockTimeUnit;
        this.titleMes = "手勢密碼解鎖";
        clearInterval(interval);
      }
    }, 1000);
  }

  //重置手勢密碼
  resetPasswordFun() {
    this.titleMes = '請输入舊手勢密碼';
    this.gestureLockObj.step = 3;
  }

  deletPasswordFun() {
    window.localStorage.removeItem("gestureLockObj");
    this.gestureLockObj = new GestureLockObj();
    this.titleMes = '請繪製你的手勢密碼';
    this.reset();
  }

  //設置手勢密碼矩陣
  setChooseType(type: any) {
    this.chooseType = type;
  }

  //初始化手勢點的座標數組
  private initPointArray() {
    const n = this.chooseType;
    const radius = this.radius;
    this.selectedPointArray = [];
    this.allPointArray = [];
    this.unSelectedPointArray = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const obj = {
          x: (j * 4 + 3) * radius,
          y: (i * 4 + 3) * radius,
          index: ((i * n + 1 + j) + 2) * 7 - 1
        };
        this.allPointArray.push(obj);
        this.unSelectedPointArray.push(obj);
      }
    }
  }

  //滑動手勢的時候更新畫布
  private update(nowPoint: Point) {
    this.drawAll(this.selectedColor, nowPoint);
    this.dealPoint(this.unSelectedPointArray, nowPoint);
  }

  private checkPassword(pointArray: any, password: any): boolean {
    return password === this.parsePassword(pointArray);
  }

  private parsePassword(pointArray: any): string {
    return pointArray.map((data: any) => {
      return data.index;
    }).join("");
  }

  //獲得手指滑動點的位置
  private getPosition(e: any): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.touches[0].clientX - rect.left) * this.devicePixelRatio,
      y: (e.touches[0].clientY - rect.top) * this.devicePixelRatio
    };
  }

  //重置
  reset() {
    this.initPointArray();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawCircles(this.allPointArray);
  }

  //添加滑動監聽事件
  private bindEvent() {
    this.render.listen(this.canvas.nativeElement, "touchstart", (e) => {
      e.preventDefault();
      if (this.selectedPointArray.length === 0 && this.gestureAttemptObj.attemptsNu !== 0) {
        this.dealPoint(this.allPointArray, this.getPosition(e), true);
      }
    });
    this.render.listen(this.canvas.nativeElement, "touchmove", (e) => {
      if (this.canTouch) {
        this.update(this.getPosition(e));
      }
    });
    const self = this;
    this.render.listen(this.canvas.nativeElement, "touchend", () => {
      if (this.canTouch) {
        this.canTouch = false;
        this.dealPassword(this.selectedPointArray);
        setTimeout(function () {
          self.reset();
        }, 1000);
      }
    });
  }

  //繪製滑動螢幕後的點
  private drawAll(color: any, nowPoint: Point | null = null) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawCircles(this.allPointArray);
    this.drawCircles(this.selectedPointArray, color);
    this.drawPoints(this.selectedPointArray, color);
    this.drawLine(this.selectedPointArray, color, nowPoint);
  }

  //滑動點的时候處理是否滑中點
  private dealPoint(pointArry: Point[], nowPoint: Point, canTouch = false) {
    for (let i = 0; i < pointArry.length; i++) {
      if (Math.abs(Number(nowPoint.x) - Number(pointArry[i].x)) < this.radius && Math.abs(Number(nowPoint.y) - Number(pointArry[i].y)) < this.radius) {
        if (canTouch) {
          this.canTouch = true;
        }
        this.drawPoint(pointArry[i]);
        this.selectedPointArray.push(pointArry[i]);
        this.unSelectedPointArray.splice(i, 1);
        break;
      }
    }
  }

  private drawPoints(pointArray: Point[], style = this.selectedColor) {
    for (const value of pointArray) {
      this.drawPoint(value, style);
    }
  }

  private drawCircles(pointArray: Point[], style = this.unSelectedColor) {
    for (const value of pointArray) {
      this.drawCircle(value, style);
    }
  }

  //畫圈
  private drawCircle(point: Point, style = this.unSelectedColor) {
    this.ctx.strokeStyle = style;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.radius, 0, Math.PI * 2, true);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  //畫點
  private drawPoint(point: Point, style = this.selectedColor) {
    this.ctx.fillStyle = style;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.radius / 2.5, 0, Math.PI * 2, true);
    this.ctx.closePath();
    this.ctx.fill();
  }

  //畫線
  private drawLine(pointArray: Point[], style: any, nowPoint: Point | null = null) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = style;
    this.ctx.lineWidth = 3;

    this.ctx.moveTo(pointArray[0].x, pointArray[0].y);
    for (let i = 1; i < pointArray.length; i++) {
      this.ctx.lineTo(pointArray[i].x, pointArray[i].y);
    }
    if (nowPoint) {
      this.ctx.lineTo(nowPoint.x, nowPoint.y);
    }
    this.ctx.stroke();
    this.ctx.closePath();
  }

}
