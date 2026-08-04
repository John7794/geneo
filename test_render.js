import { renderRecords } from './scripts/components/ui/profile/records.js';
const data = [
  { record_id: "rec_137_r_4", title: "4-а", images: "img1", external_link: "link1", _role: "Role" },
  { record_id: "rec_137_r_4", title: "4-а", images: "img2", external_link: "", _role: "Role" },
  { record_id: "rec_137_r_5", title: "5-а", images: "img3", external_link: "link3", _role: "Role" }
];
console.log(renderRecords({ _records: data }));
