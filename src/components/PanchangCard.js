import { Card, CardContent } from '@/components/ui/card'

const PanchangCard = ({ label, value }) => {
  return (
    <Card className="p-4 text-center hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        <div className="text-lg font-semibold text-blue-600">{value}</div>
      </CardContent>
    </Card>
  )
}

export default PanchangCard

